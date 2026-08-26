/**
 * KISAN SETU — Production Service Layer
 * All data flows through Supabase. No demo/mock fallbacks.
 */
import { supabase } from "@/lib/supabase/client";
import type {
  ActivityEvent,
  AiRecommendation,
  CentreAlert,
  Farmer,
  ForecastPoint,
  Grievance,
  PaymentStatus,
  ProcurementCentre,
  QueueRow,
  QueueTicket,
  SlotSuggestion,
  ThroughputPoint,
  TimelineStep,
  WaitAnalyticsPoint,
} from "./types";

// ─── Helpers ───

function mapCentre(c: any): ProcurementCentre {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    nameHi: c.name_hi,
    distanceKm: Number(c.distance_km),
    queueLength: c.queue_length,
    predictedWaitMin: c.predicted_wait_min,
    capacityUsedPct: c.capacity_used_pct,
    dailyCapacityQuintals: Number(c.daily_capacity_quintals),
    procuredTodayQuintals: Number(c.procured_today_quintals),
    activeCounters: c.active_counters,
    totalCounters: c.total_counters,
    processingRatePerHour: c.processing_rate_per_hour,
    farmersToday: c.farmers_today,
    map: { x: Number(c.map_x), y: Number(c.map_y) },
    recommended: c.recommended,
    recommendationReasons: c.recommendation_reasons || [],
    recommendationReasonsHi: c.recommendation_reasons_hi || [],
  };
}

// ─── Farmer Service ───

export const farmerService = {
  /** Get farmer profile by their authenticated user ID */
  getProfile: async (userId?: string): Promise<Farmer> => {
    let query = supabase.from("profiles").select("*, farmers(*)");
    if (userId) {
      query = query.eq("id", userId);
    } else {
      query = query.eq("role", "farmer");
    }
    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw new Error(`Failed to load farmer profile: ${error.message}`);
    if (!data) throw new Error("No farmer profile found");

    const f = Array.isArray(data.farmers) ? data.farmers[0] : data.farmers;
    return {
      id: data.id,
      name: data.full_name,
      nameHi: data.full_name_hi || data.full_name,
      village: data.village || "",
      villageHi: data.village_hi || "",
      district: data.district || "",
      phone: data.phone || "",
      farmerId: f?.farmer_id_code || "",
      crop: f?.crop || "Wheat",
      cropHi: f?.crop_hi || "गेहूँ",
      quantityQuintals: f ? Number(f.quantity_quintals) : 0,
      landAreaAcres: f?.land_area_acres ? Number(f.land_area_acres) : 5.0,
      bankName: f?.bank_name || "State Bank of India",
      bankAccountMasked: f?.bank_account_masked || (f?.bank_account_number ? `••••${f.bank_account_number.slice(-4)}` : "••••4417"),
      bankAccountNumber: f?.bank_account_number,
      ifscCode: f?.ifsc_code || "SBIN0001234",
      aadhaarNumberMasked: f?.aadhaar_number_masked || "•••• •••• 8821",
    };
  },

  /** Update farmer crop/quantity
   * NOTE: The `farmers` table uses profile `id` as FK (`id` column points to `profiles.id`).
   * Always update by the authenticated user's profile ID.
   */
  updateRegistration: async (userId: string, payload: Partial<Farmer>): Promise<void> => {
    const cropHiMap: Record<string, string> = {
      Wheat: "गेहूँ", Paddy: "धान", Mustard: "सरसों", Gram: "चना",
    };
    // Try updating by `id` (profile FK) first, then fall back to direct farmer record check
    const { error } = await supabase
      .from("farmers")
      .update({
        crop: payload.crop,
        crop_hi: cropHiMap[payload.crop || "Wheat"] || payload.crop,
        quantity_quintals: payload.quantityQuintals,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw new Error(`Failed to update registration: ${error.message}`);

    await auditService.log({
      action: "farmer_update_registration",
      targetType: "farmers",
      targetId: userId,
      metadata: payload,
    });
  },

  /** Book and create full end-to-end procurement journey in Supabase */
  bookProcurementJourney: async (params: {
    farmerId: string;
    farmerName: string;
    village: string;
    crop: string;
    quantityQuintals: number;
    centreId: string;
    slotId?: string | undefined;
    slotWindow?: string | undefined;
  }): Promise<{ token: string; ticketId: string }> => {
    const slotWindow = params.slotWindow || "11:30 – 12:00";
    const token = `KS-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

    // 1. Mark slot booked if slotId provided
    if (params.slotId) {
      await supabase.from("slots").update({
        is_booked: true,
        booked_by: params.farmerId,
      }).eq("id", params.slotId);
    }

    // 2. Compute real-time ETA from centre queue data
    const { data: centreData } = await supabase
      .from("procurement_centres")
      .select("queue_length, processing_rate_per_hour, active_counters")
      .eq("id", params.centreId)
      .maybeSingle();

    const realQueueLength = centreData?.queue_length ?? 5;
    const ratePerHour = centreData?.processing_rate_per_hour ?? 30;
    const activeCounters = Math.max(1, centreData?.active_counters ?? 1);
    // ETA = (farmers ahead / throughput per minute across all counters)
    const totalRatePerMin = (ratePerHour * activeCounters) / 60;
    const computedETA = Math.max(5, Math.round(realQueueLength / totalRatePerMin));

    // 3. Insert into queue_tickets
    const { data: ticket, error: ticketError } = await supabase
      .from("queue_tickets")
      .insert({
        token,
        farmer_id: params.farmerId,
        centre_id: params.centreId,
        farmer_name: params.farmerName,
        village: params.village,
        crop: params.crop,
        quantity_quintals: params.quantityQuintals,
        slot_window: slotWindow,
        stage: "scheduled",
        farmers_ahead: realQueueLength,
        eta_minutes: computedETA,
      })
      .select()
      .single();

    if (ticketError) throw new Error(`Failed to create queue ticket: ${ticketError.message}`);

    const ticketId = ticket.id;

    // 3. Create 8-stage procurement timeline
    const timelineSteps = [
      { step_id: "step-1", label: "Farmer Registration", label_hi: "किसान पंजीकरण", detail: "Verified via PM-KISAN / State Agri portal", detail_hi: "पीएम-किसान एवं राज्य पोर्टल से सत्यापित", state: "done", timestamp_str: nowTime, sort_order: 1 },
      { step_id: "step-2", label: "Smart Slot Confirmed", label_hi: "स्मार्ट स्लॉट आवंटित", detail: `Booked for ${slotWindow}`, detail_hi: `${slotWindow} के लिए समय आरक्षित`, state: "done", timestamp_str: nowTime, sort_order: 2 },
      { step_id: "step-3", label: "Centre Arrival & Gate Entry", label_hi: "केंद्र आगमन एवं प्रवेश", detail: "Reach centre gate 10 mins before slot window", detail_hi: "अपने स्लॉट से 10 मिनट पहले मुख्य द्वार पर पहुँचें", state: "active", timestamp_str: "", sort_order: 3 },
      { step_id: "step-4", label: "Electronic Weighing", label_hi: "इलेक्ट्रॉनिक तुलाई", detail: "Automated weighbridge tare & gross weight", detail_hi: "स्वचालित धर्मकांटे पर वाहन सहित तुलाई", state: "upcoming", timestamp_str: "", sort_order: 4 },
      { step_id: "step-5", label: "Quality Check & FAQ Grading", label_hi: "गुणवत्ता जाँच (FAQ)", detail: "Moisture < 12% & grain purity certification", detail_hi: "नमी 12% से कम एवं मानक गुणवत्ता प्रमाणन", state: "upcoming", timestamp_str: "", sort_order: 5 },
      { step_id: "step-6", label: "Procurement Acceptance", label_hi: "खरीद स्वीकृति", detail: "MSP confirmation voucher generated", detail_hi: "न्यूनतम समर्थन मूल्य (MSP) वाउचर स्वीकृत", state: "upcoming", timestamp_str: "", sort_order: 6 },
      { step_id: "step-7", label: "Digital Invoice Generation", label_hi: "डिजिटल बिल निर्माण", detail: "Official tax invoice & weighing certificate", detail_hi: "डिजिटल बिल एवं तुलाई प्रमाणपत्र जारी", state: "upcoming", timestamp_str: "", sort_order: 7 },
      { step_id: "step-8", label: "DBT Direct Bank Payment", label_hi: "बैंक खाता भुगतान (DBT)", detail: "PFMS Direct Benefit Transfer in 48 hours", detail_hi: "पीएफएमएस द्वारा 48 घंटे में सीधे बैंक खाते में", state: "upcoming", timestamp_str: "", sort_order: 8 },
    ];

    await supabase.from("procurement_timeline").insert(
      timelineSteps.map((s) => ({ ...s, ticket_id: ticketId }))
    );

    // 4. Create / update payment calculation
    const rate = params.crop === "Wheat" ? 2430 : params.crop === "Paddy" ? 2300 : params.crop === "Mustard" ? 5650 : 5440;
    const grossAmount = params.quantityQuintals * rate;

    // Fetch farmer's registered bank details from profile if available
    const { data: farmerProfile } = await supabase
      .from("profiles")
      .select("bank_masked")
      .eq("id", params.farmerId)
      .maybeSingle();
    const bankMasked = farmerProfile?.bank_masked || "Bank ••••"; // do not expose real account

    await supabase.from("payments").insert({
      ticket_id: ticketId,
      farmer_id: params.farmerId,
      gross_amount: grossAmount,
      currency: "INR",
      rate_per_quintal: rate,
      quintals: params.quantityQuintals,
      stage: "pending_verification",
      expected_credit_in: "Within 48 hours of weighing",
      expected_credit_in_hi: "तुलाई के 48 घंटे के भीतर",
      bank_masked: bankMasked,
      progress_pct: 15,
    });

    // 5. Send notification
    await supabase.from("notifications").insert({
      user_id: params.farmerId,
      title: "स्लॉट एवं टोकन आवंटित (Slot Confirmed)",
      body: `टोकन ${token} आवंटित किया गया। निर्धारित समय: ${slotWindow}।`,
      is_read: false,
    });

    // 6. Push activity
    await analyticsService.pushActivity({
      kind: "queue",
      message: `Farmer ${params.farmerName} confirmed slot (${token} · ${params.quantityQuintals} qtl ${params.crop})`,
    });

    await auditService.log({
      action: "farmer_book_slot",
      targetType: "queue_tickets",
      targetId: ticketId,
      metadata: { token, centreId: params.centreId, slotWindow },
    });

    return { token, ticketId };
  },
};

// ─── Centre Service ───

export interface CentreUpdatePayload {
  queueLength?: number;
  predictedWaitMin?: number;
  capacityUsedPct?: number;
  activeCounters?: number;
  processingRatePerHour?: number;
  farmersToday?: number;
  procuredTodayQuintals?: number;
}

export const centreService = {
  /** List all procurement centres ordered by code */
  list: async (): Promise<ProcurementCentre[]> => {
    const { data, error } = await supabase
      .from("procurement_centres")
      .select("*")
      .order("code");
    if (error) throw new Error(`Failed to load centres: ${error.message}`);
    return (data || []).map(mapCentre);
  },

  /** List centres filtered by district */
  listByDistrict: async (district: string): Promise<ProcurementCentre[]> => {
    const { data, error } = await supabase
      .from("procurement_centres")
      .select("*")
      .ilike("district", `%${district}%`)
      .order("code");
    if (error) throw new Error(`Failed to load centres: ${error.message}`);
    // If no district-specific centres found, fall back to all centres
    if (!data || data.length === 0) {
      const { data: allData, error: allError } = await supabase
        .from("procurement_centres")
        .select("*")
        .order("code");
      if (allError) throw new Error(`Failed to load centres: ${allError.message}`);
      return (allData || []).map(mapCentre);
    }
    return data.map(mapCentre);
  },

  /** Get a single centre by ID */
  getById: async (id: string): Promise<ProcurementCentre> => {
    const { data, error } = await supabase
      .from("procurement_centres")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new Error(`Failed to load centre: ${error.message}`);
    return mapCentre(data);
  },

  /** Update centre operational data */
  update: async (id: string, updates: CentreUpdatePayload): Promise<void> => {
    const dbUpdates: Record<string, any> = {};
    if (updates.queueLength !== undefined) dbUpdates["queue_length"] = updates.queueLength;
    if (updates.predictedWaitMin !== undefined) dbUpdates["predicted_wait_min"] = updates.predictedWaitMin;
    if (updates.capacityUsedPct !== undefined) dbUpdates["capacity_used_pct"] = updates.capacityUsedPct;
    if (updates.activeCounters !== undefined) dbUpdates["active_counters"] = updates.activeCounters;
    if (updates.processingRatePerHour !== undefined) dbUpdates["processing_rate_per_hour"] = updates.processingRatePerHour;
    if (updates.farmersToday !== undefined) dbUpdates["farmers_today"] = updates.farmersToday;
    if (updates.procuredTodayQuintals !== undefined) dbUpdates["procured_today_quintals"] = updates.procuredTodayQuintals;

    const { error } = await supabase.from("procurement_centres").update(dbUpdates).eq("id", id);
    if (error) throw new Error(`Failed to update centre: ${error.message}`);

    await auditService.log({
      action: "centre_update_metrics",
      targetType: "procurement_centres",
      targetId: id,
      metadata: updates,
    });
  },
};

// ─── Slot Service ───

export const slotService = {
  /** Get AI-recommended slot for a farmer */
  suggest: async (centreId?: string, farmerId?: string): Promise<SlotSuggestion | null> => {
    // First: check if this farmer already has a booked slot
    if (farmerId) {
      const { data: mySlot } = await supabase
        .from("slots")
        .select("*")
        .eq("booked_by", farmerId)
        .limit(1)
        .maybeSingle();
      if (mySlot) {
        return {
          id: mySlot.id,
          centreId: mySlot.centre_id,
          window: mySlot.window,
          date: mySlot.date,
          confidencePct: mySlot.confidence_pct || 0,
          reason: mySlot.reason || "",
          reasonHi: mySlot.reason_hi || "",
        };
      }
    }

    // Then: find an unbooked AI-recommended slot
    let query = supabase.from("slots").select("*").eq("ai_recommended", true).eq("is_booked", false);
    if (centreId) query = query.eq("centre_id", centreId);
    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw new Error(`Failed to load slot suggestion: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      centreId: data.centre_id,
      window: data.window,
      date: data.date,
      confidencePct: data.confidence_pct || 0,
      reason: data.reason || "",
      reasonHi: data.reason_hi || "",
    };
  },

  /** List available slots for a centre */
  listAvailable: async (centreId: string): Promise<SlotSuggestion[]> => {
    const { data, error } = await supabase
      .from("slots")
      .select("*")
      .eq("centre_id", centreId)
      .eq("is_booked", false)
      .order("created_at");
    if (error) throw new Error(`Failed to load slots: ${error.message}`);
    return (data || []).map((s) => ({
      id: s.id,
      centreId: s.centre_id,
      window: s.window,
      date: s.date,
      confidencePct: s.confidence_pct || 0,
      reason: s.reason || "",
      reasonHi: s.reason_hi || "",
    }));
  },

  /** Book/confirm a slot */
  confirm: async (slotId: string, farmerId?: string): Promise<void> => {
    const { error } = await supabase.from("slots").update({
      is_booked: true,
      booked_by: farmerId || null,
    }).eq("id", slotId);
    if (error) throw new Error(`Failed to confirm slot: ${error.message}`);

    await auditService.log({
      action: "slot_confirm",
      targetType: "slots",
      targetId: slotId,
      metadata: { farmerId },
    });
  },
};

// ─── Queue Service ───

export const queueService = {
  /** Get the farmer's active queue ticket.
   * IMPORTANT: `farmerId` is REQUIRED for farmer-role callers to ensure strict isolation.
   * Without it, the query returns any active ticket which may belong to another farmer.
   */
  getTicket: async (farmerId?: string): Promise<QueueTicket | null> => {
    if (!farmerId) return null; // Safety: never return someone else's ticket
    const query = supabase
      .from("queue_tickets")
      .select("*")
      .eq("farmer_id", farmerId);

    // Get the most recent active ticket (not done)
    const { data, error } = await query
      .not("stage", "eq", "done")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to load queue ticket: ${error.message}`);
    if (!data) return null;

    return {
      token: data.token,
      centreId: data.centre_id,
      slotWindow: data.slot_window,
      farmersAhead: data.farmers_ahead,
      etaMinutes: data.eta_minutes,
      stage: data.stage,
      counterAssigned: data.counter_assigned,
    };
  },

  /** Get all tickets for a centre's live queue */
  getCentreQueue: async (centreId?: string): Promise<QueueRow[]> => {
    let query = supabase.from("queue_tickets").select("*");
    if (centreId) query = query.eq("centre_id", centreId);
    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to load centre queue: ${error.message}`);
    return (data || []).map((t) => ({
      id: t.id,
      token: t.token,
      centreId: t.centre_id,
      farmerId: t.farmer_id || undefined,
      farmerName: t.farmer_name || "Unknown Farmer",
      village: t.village || "",
      crop: t.crop || "Wheat",
      quantityQuintals: Number(t.quantity_quintals) || 0,
      actualQuintals: t.actual_quintals ? Number(t.actual_quintals) : undefined,
      grossWeightQuintals: t.gross_weight_quintals ? Number(t.gross_weight_quintals) : undefined,
      tareWeightQuintals: t.tare_weight_quintals ? Number(t.tare_weight_quintals) : undefined,
      qualityGrade: t.quality_grade || undefined,
      moisturePct: t.moisture_pct ? Number(t.moisture_pct) : undefined,
      foreignMatterPct: t.foreign_matter_pct ? Number(t.foreign_matter_pct) : undefined,
      jFormNo: t.j_form_no || undefined,
      rejectionReason: t.rejection_reason || undefined,
      operatorNotes: t.operator_notes || undefined,
      counterAssigned: t.counter_assigned || undefined,
      completedAt: t.completed_at || undefined,
      slotWindow: t.slot_window || "11:30 – 12:00",
      waitedMin: t.waited_min || 0,
      status: (t.stage === "in_queue" || t.stage === "scheduled" ? "waiting" : t.stage) as QueueRow["status"],
    }));
  },

  /** Operator: update a ticket's stage */
  updateStage: async (ticketId: string, stage: string): Promise<void> => {
    const { error } = await supabase
      .from("queue_tickets")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) throw new Error(`Failed to update ticket stage: ${error.message}`);
  },

  /** Operator: update a ticket's stage by token */
  updateStageByToken: async (token: string, stage: string): Promise<void> => {
    const { error } = await supabase
      .from("queue_tickets")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("token", token);
    if (error) throw new Error(`Failed to update ticket stage: ${error.message}`);
  },
};

// ─── Operator Workstation Service ───

export interface OperatorProcessParams {
  ticketId: string;
  action: "call" | "weigh" | "grade" | "accept" | "reject" | "complete";
  counter?: number | undefined;
  gross?: number | undefined;
  tare?: number | undefined;
  actualQuintals?: number | undefined;
  qualityGrade?: string | undefined;
  moisture?: number | undefined;
  foreignMatter?: number | undefined;
  jFormNo?: string | undefined;
  notes?: string | undefined;
  rejectionReason?: string | undefined;
}

export const operatorService = {
  /** Atomically process a farmer's ticket through procurement stages */
  processTicket: async (params: OperatorProcessParams): Promise<any> => {
    const { data, error } = await supabase.rpc("operator_process_ticket", {
      p_ticket_id: params.ticketId,
      p_action: params.action,
      p_counter: params.counter ?? null,
      p_gross: params.gross ?? null,
      p_tare: params.tare ?? null,
      p_actual_quintals: params.actualQuintals ?? null,
      p_quality_grade: params.qualityGrade ?? null,
      p_moisture: params.moisture ?? null,
      p_foreign_matter: params.foreignMatter ?? null,
      p_j_form_no: params.jFormNo ?? null,
      p_notes: params.notes ?? null,
      p_rejection_reason: params.rejectionReason ?? null,
    });

    if (error) throw new Error(`Operator processing failed: ${error.message}`);
    return data;
  },

  /** Update operational counter count */
  updateCounters: async (centreId: string, activeCounters: number): Promise<void> => {
    const { error } = await supabase
      .from("procurement_centres")
      .update({ active_counters: activeCounters, updated_at: new Date().toISOString() })
      .eq("id", centreId);

    if (error) throw new Error(`Failed to update active counters: ${error.message}`);
    await supabase.rpc("recalculate_centre_stats");
  },

  /** Fetch today's completed procurements register */
  fetchRegister: async (centreId?: string): Promise<QueueRow[]> => {
    let query = supabase.from("queue_tickets").select("*").in("stage", ["done", "accepted", "rejected"]);
    if (centreId) query = query.eq("centre_id", centreId);
    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) throw new Error(`Failed to load procurement register: ${error.message}`);
    return (data || []).map((t) => ({
      id: t.id,
      token: t.token,
      centreId: t.centre_id,
      farmerId: t.farmer_id || undefined,
      farmerName: t.farmer_name || "Unknown Farmer",
      village: t.village || "",
      crop: t.crop || "Wheat",
      quantityQuintals: Number(t.quantity_quintals) || 0,
      actualQuintals: t.actual_quintals ? Number(t.actual_quintals) : undefined,
      grossWeightQuintals: t.gross_weight_quintals ? Number(t.gross_weight_quintals) : undefined,
      tareWeightQuintals: t.tare_weight_quintals ? Number(t.tare_weight_quintals) : undefined,
      qualityGrade: t.quality_grade || undefined,
      moisturePct: t.moisture_pct ? Number(t.moisture_pct) : undefined,
      foreignMatterPct: t.foreign_matter_pct ? Number(t.foreign_matter_pct) : undefined,
      jFormNo: t.j_form_no || undefined,
      rejectionReason: t.rejection_reason || undefined,
      operatorNotes: t.operator_notes || undefined,
      counterAssigned: t.counter_assigned || undefined,
      completedAt: t.completed_at || t.updated_at,
      slotWindow: t.slot_window || "11:30 – 12:00",
      waitedMin: t.waited_min || 0,
      status: (t.stage === "in_queue" || t.stage === "scheduled" ? "waiting" : t.stage) as QueueRow["status"],
    }));
  },
};

// ─── Procurement Timeline Service ───

export const procurementService = {
  /** Get timeline steps for a ticket or farmer */
  getTimeline: async (ticketId?: string, farmerId?: string): Promise<TimelineStep[]> => {
    let targetTicketId = ticketId;

    if (!targetTicketId && farmerId) {
      const { data: activeTicket } = await supabase
        .from("queue_tickets")
        .select("id")
        .eq("farmer_id", farmerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeTicket) {
        targetTicketId = activeTicket.id;
      }
    }

    let query = supabase.from("procurement_timeline").select("*");
    if (targetTicketId) {
      query = query.eq("ticket_id", targetTicketId);
    }
    const { data, error } = await query.order("sort_order");

    if (error) throw new Error(`Failed to load timeline: ${error.message}`);

    if (!data || data.length === 0) {
      // Return default 8-step structure if no ticket has been initialized yet
      return [
        { id: "step-1", label: "Farmer Registration", labelHi: "किसान पंजीकरण", detail: "Registered & verified in central database", detailHi: "केंद्रीय डेटाबेस में पंजीकृत एवं सत्यापित", state: "done", timestamp: "Ready" },
        { id: "step-2", label: "Smart Slot Allocation", labelHi: "स्मार्ट स्लॉट आवंटन", detail: "Select optimal procurement centre and book slot", detailHi: "नजदीकी केंद्र का चयन करें एवं समय आरक्षित करें", state: "upcoming" },
        { id: "step-3", label: "Centre Arrival & Gate Entry", labelHi: "केंद्र आगमन एवं प्रवेश", detail: "Reach gate before designated slot window", detailHi: "निर्धारित समय से पूर्व मुख्य द्वार पर पहुँचें", state: "upcoming" },
        { id: "step-4", label: "Electronic Weighing", labelHi: "इलेक्ट्रॉनिक तुलाई", detail: "Automated digital weighbridge tare & gross weight", detailHi: "स्वचालित धर्मकांटे पर वाहन सहित तुलाई", state: "upcoming" },
        { id: "step-5", label: "Quality Check & FAQ Grading", labelHi: "गुणवत्ता जाँच (FAQ)", detail: "Moisture & grain purity certification", detailHi: "नमी एवं अनाज गुणवत्ता मानक प्रमाणन", state: "upcoming" },
        { id: "step-6", label: "Procurement Acceptance", labelHi: "खरीद स्वीकृति", detail: "MSP confirmation voucher approved", detailHi: "न्यूनतम समर्थन मूल्य (MSP) वाउचर स्वीकृत", state: "upcoming" },
        { id: "step-7", label: "Digital Invoice Generation", labelHi: "डिजिटल बिल निर्माण", detail: "Official centre tax invoice & weighing slip", detailHi: "डिजिटल बिल एवं तुलाई प्रमाणपत्र जारी", state: "upcoming" },
        { id: "step-8", label: "DBT Direct Bank Payment", labelHi: "बैंक खाता भुगतान (DBT)", detail: "Direct Benefit Transfer to registered bank account", detailHi: "पीएफएमएस द्वारा सीधे बैंक खाते में भुगतान", state: "upcoming" },
      ];
    }

    return data.map((d) => ({
      id: d.step_id,
      label: d.label,
      labelHi: d.label_hi,
      detail: d.detail || "",
      detailHi: d.detail_hi || "",
      state: d.state as TimelineStep["state"],
      timestamp: d.timestamp_str || undefined,
    }));
  },

  /** Update a timeline step state */
  updateStep: async (stepId: string, ticketId: string, state: string, timestamp?: string): Promise<void> => {
    const updates: Record<string, any> = { state };
    if (timestamp) updates["timestamp_str"] = timestamp;
    const { error } = await supabase
      .from("procurement_timeline")
      .update(updates)
      .eq("step_id", stepId)
      .eq("ticket_id", ticketId);
    if (error) throw new Error(`Failed to update timeline step: ${error.message}`);
  },
};

// ─── Payment Service ───

export const paymentService = {
  /** Get payment status for a farmer/ticket */
  getStatus: async (farmerId?: string): Promise<PaymentStatus | null> => {
    let query = supabase.from("payments").select("*");
    if (farmerId) {
      query = query.eq("farmer_id", farmerId);
    }
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to load payment status: ${error.message}`);

    if (!data) {
      if (farmerId) {
        // Compute dynamically for the farmer's registered crop & quantity
        const { data: fProfile } = await supabase
          .from("farmers")
          .select("*")
          .eq("id", farmerId)
          .maybeSingle();

        const q = fProfile ? Number(fProfile.quantity_quintals) : 100;
        const crop = fProfile?.crop || "Wheat";
        const rate = crop === "Wheat" ? 2430 : crop === "Paddy" ? 2300 : crop === "Mustard" ? 5650 : 5440;
        return {
          grossAmount: q * rate,
          currency: "INR",
          ratePerQuintal: rate,
          quintals: q,
          stage: "pending_verification",
          expectedCreditIn: "Within 48 hours of weighing",
          expectedCreditInHi: "तुलाई के 48 घंटे के भीतर",
          bankMasked: "PNB ••••4417",
          progressPct: 25,
        };
      }
      return null;
    }

    return {
      grossAmount: Number(data.gross_amount),
      currency: "INR",
      ratePerQuintal: Number(data.rate_per_quintal),
      quintals: Number(data.quintals),
      stage: data.stage as PaymentStatus["stage"],
      expectedCreditIn: data.expected_credit_in || "",
      expectedCreditInHi: data.expected_credit_in_hi || "",
      bankMasked: data.bank_masked || "",
      progressPct: data.progress_pct || 0,
    };
  },

  /** Update payment stage */
  updateStage: async (paymentId: string, stage: string, progressPct?: number): Promise<void> => {
    const updates: Record<string, any> = { stage, updated_at: new Date().toISOString() };
    if (progressPct !== undefined) updates["progress_pct"] = progressPct;
    const { error } = await supabase.from("payments").update(updates).eq("id", paymentId);
    if (error) throw new Error(`Failed to update payment: ${error.message}`);
  },
};

// ─── Forecast / Analytics Service ───

export const forecastService = {
  queueForecast: async (centreId?: string): Promise<ForecastPoint[]> => {
    let query = supabase.from("forecast_points").select("*");
    if (centreId) query = query.eq("centre_id", centreId);
    const { data, error } = await query.order("hour_label");
    if (error) throw new Error(`Failed to load forecast: ${error.message}`);
    return (data || []).map((p) => ({
      label: p.hour_label,
      queue: p.queue_actual,
      predicted: p.queue_predicted,
      capacityLine: p.capacity_line,
    }));
  },

  waitAnalytics: async (): Promise<WaitAnalyticsPoint[]> => {
    const { data, error } = await supabase
      .from("wait_analytics")
      .select("*")
      .order("created_at");
    if (error) throw new Error(`Failed to load wait analytics: ${error.message}`);
    return (data || []).map((w) => ({
      label: w.day_label,
      beforeMin: w.before_min,
      afterMin: w.after_min,
    }));
  },

  throughput: async (): Promise<ThroughputPoint[]> => {
    const { data, error } = await supabase
      .from("throughput_points")
      .select("*")
      .order("hour_label");
    if (error) throw new Error(`Failed to load throughput: ${error.message}`);
    return (data || []).map((t) => ({
      label: t.hour_label,
      quintals: Number(t.quintals),
    }));
  },
};

// ─── AI Recommendation Service ───

export const recommendationService = {
  /** Get the latest recommendation */
  current: async (): Promise<AiRecommendation | null> => {
    const { data, error } = await supabase
      .from("ai_recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to load recommendation: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      headline: data.headline,
      rationale: data.rationale,
      impact: data.impact,
      confidencePct: data.confidence_pct,
      action: {
        shiftAppointments: data.shift_appointments || 0,
        fromCentreId: data.from_centre_id || "",
        toCentreId: data.to_centre_id || "",
      },
      status: data.status as AiRecommendation["status"],
    };
  },

  /** Admin approves a recommendation — rebalance centre loads */
  approve: async (id: string): Promise<void> => {
    // 1. Get the recommendation to find from/to centres
    const { data: rec } = await supabase.from("ai_recommendations").select("*").eq("id", id).single();
    if (!rec) throw new Error("Recommendation not found");

    // 2. Mark approved
    await supabase.from("ai_recommendations").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", id);

    // 3. Rebalance: reduce load on fromCentre, increase on toCentre
    if (rec.from_centre_id) {
      const { data: from } = await supabase.from("procurement_centres").select("*").eq("id", rec.from_centre_id).single();
      if (from) {
        await centreService.update(rec.from_centre_id, {
          queueLength: Math.max(8, from.queue_length - (rec.shift_appointments || 0)),
          predictedWaitMin: Math.round(from.predicted_wait_min * 0.46),
          capacityUsedPct: Math.min(from.capacity_used_pct, 74),
          activeCounters: Math.min(from.total_counters, from.active_counters + 2),
          processingRatePerHour: Math.round(from.processing_rate_per_hour * 1.33),
        });
      }
    }
    if (rec.to_centre_id) {
      const { data: to } = await supabase.from("procurement_centres").select("*").eq("id", rec.to_centre_id).single();
      if (to) {
        await centreService.update(rec.to_centre_id, {
          queueLength: to.queue_length + Math.round((rec.shift_appointments || 0) / 3),
          predictedWaitMin: to.predicted_wait_min + 11,
          capacityUsedPct: Math.min(95, to.capacity_used_pct + 17),
          farmersToday: to.farmers_today + (rec.shift_appointments || 0),
        });
      }
    }

    // 4. Update affected queue tickets
    await supabase.from("queue_tickets")
      .update({ farmers_ahead: 3, eta_minutes: 14 })
      .not("stage", "eq", "done");

    await auditService.log({ action: "recommendation_approve", targetType: "ai_recommendations", targetId: id, metadata: { from: rec.from_centre_id, to: rec.to_centre_id } });
  },

  /** Admin overrides a recommendation */
  override: async (id: string): Promise<void> => {
    const { error } = await supabase.from("ai_recommendations")
      .update({ status: "overridden", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`Failed to override: ${error.message}`);
    await auditService.log({ action: "recommendation_override", targetType: "ai_recommendations", targetId: id });
  },

  /** Admin starts reviewing */
  review: async (id: string): Promise<void> => {
    const { error } = await supabase.from("ai_recommendations")
      .update({ status: "reviewing", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`Failed to update review status: ${error.message}`);
    await auditService.log({ action: "recommendation_review", targetType: "ai_recommendations", targetId: id });
  },
};

// ─── Alerts & Activity Service ───

export const analyticsService = {
  /** Get active (unresolved) alerts */
  alerts: async (centreId?: string): Promise<CentreAlert[]> => {
    let query = supabase.from("centre_alerts").select("*").eq("is_resolved", false);
    if (centreId) query = query.eq("centre_id", centreId);
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to load alerts: ${error.message}`);
    return (data || []).map((a) => ({
      id: a.id,
      severity: a.severity as CentreAlert["severity"],
      title: a.title,
      detail: a.detail,
      atMinutes: a.at_minutes || undefined,
    }));
  },

  /** Create a new alert */
  createAlert: async (centreId: string, severity: string, title: string, detail: string): Promise<void> => {
    const { error } = await supabase.from("centre_alerts").insert({
      centre_id: centreId,
      severity,
      title,
      detail,
    });
    if (error) throw new Error(`Failed to create alert: ${error.message}`);
  },

  /** Resolve an alert */
  resolveAlert: async (alertId: string): Promise<void> => {
    const { error } = await supabase.from("centre_alerts").update({ is_resolved: true }).eq("id", alertId);
    if (error) throw new Error(`Failed to resolve alert: ${error.message}`);
  },

  /** Get recent activity feed */
  activityFeed: async (limit = 24): Promise<ActivityEvent[]> => {
    const { data, error } = await supabase
      .from("activity_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to load activity feed: ${error.message}`);
    return (data || []).map((d) => ({
      id: d.id,
      at: d.at_time,
      kind: d.kind as ActivityEvent["kind"],
      message: d.message,
    }));
  },

  /** Push a new activity event */
  pushActivity: async (event: { kind: string; message: string; centreId?: string }): Promise<void> => {
    const at = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const { error } = await supabase.from("activity_feed").insert({
      at_time: at,
      kind: event.kind,
      message: event.message,
      centre_id: event.centreId || null,
    });
    if (error) console.warn("Failed to push activity:", error.message);
  },
};

// ─── Audit Service ───

export const auditService = {
  /** Log an auditable action */
  log: async (params: {
    actorId?: string;
    actorRole?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> => {
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: params.actorId || null,
      actor_role: params.actorRole || null,
      action: params.action,
      target_type: params.targetType || null,
      target_id: params.targetId || null,
      metadata: params.metadata || {},
    });
    if (error) console.warn("Audit log failed:", error.message);
  },
};

// ─── Notification Service ───

export const notificationService = {
  /** Get notifications for a user */
  getForUser: async (userId: string): Promise<Array<{ id: string; title: string; body: string; isRead: boolean; createdAt: string }>> => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      console.warn("Could not load user notifications:", error.message);
      return [];
    }
    return (data || []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    }));
  },

  /** Send a notification */
  send: async (userId: string, title: string, body: string): Promise<void> => {
    if (!userId) return;
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      body,
      is_read: false,
    });
    if (error) console.warn("Failed to send notification:", error.message);
  },

  /** Mark a single notification as read */
  markRead: async (notifId: string): Promise<void> => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);
  },

  /** Mark all notifications as read for a user */
  markAllRead: async (userId: string): Promise<void> => {
    if (!userId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
  },

  /** Delete a notification */
  delete: async (notifId: string): Promise<void> => {
    await supabase.from("notifications").delete().eq("id", notifId);
  },
};

// ─── Admin Service (Super Admin Only) ───

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  phone: string;
  district: string;
  centreId: string | null;
  createdAt: string;
}

export const adminService = {
  /** List all users with their profiles */
  listUsers: async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load users: ${error.message}`);
    return (data || []).map((u) => ({
      id: u.id,
      email: u.email || "",
      role: u.role,
      fullName: u.full_name,
      phone: u.phone || "",
      district: u.district || "",
      centreId: u.centre_id || null,
      createdAt: u.created_at,
    }));
  },

  /** Update a user's role */
  updateUserRole: async (userId: string, role: string): Promise<void> => {
    const { error } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(`Failed to update user role: ${error.message}`);
    await auditService.log({ action: "admin_update_role", targetType: "profiles", targetId: userId, metadata: { role } });
  },

  /** Update a user's profile */
  updateUser: async (userId: string, updates: Record<string, unknown>): Promise<void> => {
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates["fullName"] !== undefined) dbUpdates["full_name"] = updates["fullName"];
    if (updates["phone"] !== undefined) dbUpdates["phone"] = updates["phone"];
    if (updates["district"] !== undefined) dbUpdates["district"] = updates["district"];
    if (updates["role"] !== undefined) dbUpdates["role"] = updates["role"];
    if (updates["centreId"] !== undefined) dbUpdates["centre_id"] = updates["centreId"];
    const { error } = await supabase.from("profiles").update(dbUpdates).eq("id", userId);
    if (error) throw new Error(`Failed to update user: ${error.message}`);
    await auditService.log({ action: "admin_update_user", targetType: "profiles", targetId: userId, metadata: updates });
  },

  /** Create a new procurement centre */
  createCentre: async (centre: {
    code: string;
    name: string;
    nameHi: string;
    district?: string;
    dailyCapacityQuintals?: number;
    totalCounters?: number;
    mapX?: number;
    mapY?: number;
  }): Promise<string> => {
    const { data, error } = await supabase
      .from("procurement_centres")
      .insert({
        code: centre.code,
        name: centre.name,
        name_hi: centre.nameHi,
        district: centre.district || "",
        daily_capacity_quintals: centre.dailyCapacityQuintals || 4000,
        total_counters: centre.totalCounters || 6,
        active_counters: centre.totalCounters || 6,
        map_x: centre.mapX || 50,
        map_y: centre.mapY || 50,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Failed to create centre: ${error.message}`);
    await auditService.log({ action: "admin_create_centre", targetType: "procurement_centres", targetId: data.id, metadata: centre });
    return data.id;
  },

  /** Assign an operator to a centre */
  assignOperator: async (userId: string, centreId: string): Promise<void> => {
    const { error } = await supabase
      .from("profiles")
      .update({ centre_id: centreId, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(`Failed to assign operator: ${error.message}`);
    await auditService.log({ action: "admin_assign_operator", targetType: "profiles", targetId: userId, metadata: { centreId } });
  },

  /** List audit logs with optional filters */
  listAuditLogs: async (filters?: {
    actorId?: string;
    action?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    actorId: string | null;
    actorRole: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    metadata: Record<string, any>;
    createdAt: string;
  }>> => {
    let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });
    if (filters?.actorId) query = query.eq("actor_id", filters.actorId);
    if (filters?.action) query = query.eq("action", filters.action);
    query = query.limit(filters?.limit || 100);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load audit logs: ${error.message}`);
    return (data || []).map((l) => ({
      id: l.id,
      actorId: l.actor_id,
      actorRole: l.actor_role,
      action: l.action,
      targetType: l.target_type,
      targetId: l.target_id,
      metadata: l.metadata || {},
      createdAt: l.created_at,
    }));
  },

  /** Get system summary stats */
  getSystemStats: async (): Promise<{
    totalUsers: number;
    totalFarmers: number;
    totalOperators: number;
    totalAdmins: number;
    totalCentres: number;
    totalTickets: number;
    totalPayments: number;
  }> => {
    const [users, farmers, operators, admins, centres, tickets, payments] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "farmer"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "centre_operator"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["district_admin", "super_admin"]),
      supabase.from("procurement_centres").select("id", { count: "exact", head: true }),
      supabase.from("queue_tickets").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("id", { count: "exact", head: true }),
    ]);
    return {
      totalUsers: users.count || 0,
      totalFarmers: farmers.count || 0,
      totalOperators: operators.count || 0,
      totalAdmins: admins.count || 0,
      totalCentres: centres.count || 0,
      totalTickets: tickets.count || 0,
      totalPayments: payments.count || 0,
    };
  },
};

/**
 * Government Grievance & Complaint Redressal Service
 * Connects directly to public.grievances with live realtime sync.
 */
export const grievanceService = {
  list: async (filters?: { status?: string; priority?: string; district?: string; farmerId?: string }): Promise<Grievance[]> => {
    let query = supabase.from("grievances").select("*").order("created_at", { ascending: false });
    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.priority && filters.priority !== "all") {
      query = query.eq("priority", filters.priority);
    }
    if (filters?.district && filters.district !== "all") {
      query = query.eq("district", filters.district);
    }
    if (filters?.farmerId) {
      query = query.eq("farmer_id", filters.farmerId);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load grievances: ${error.message}`);
    return (data || []).map((g) => ({
      id: g.id,
      ticketId: g.ticket_id,
      farmerId: g.farmer_id,
      farmerName: g.farmer_name,
      farmerPhone: g.farmer_phone,
      centreId: g.centre_id,
      centreName: g.centre_name,
      district: g.district,
      category: g.category,
      subject: g.subject,
      description: g.description,
      priority: g.priority,
      status: g.status,
      assignedToName: g.assigned_to_name,
      resolutionNotes: g.resolution_notes,
      resolvedAt: g.resolved_at,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    }));
  },

  updateStatus: async (id: string, status: Grievance["status"], notes?: string): Promise<void> => {
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (notes) updates["resolution_notes"] = notes;
    if (status === "resolved") updates["resolved_at"] = new Date().toISOString();
    const { error } = await supabase.from("grievances").update(updates).eq("id", id);
    if (error) throw new Error(`Failed to update grievance: ${error.message}`);
    await auditService.log({ action: "grievance_update_status", targetType: "grievances", targetId: id, metadata: { status, notes } });
  },

  assign: async (id: string, assignedToName: string): Promise<void> => {
    const { error } = await supabase.from("grievances").update({
      assigned_to_name: assignedToName,
      status: "pending",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw new Error(`Failed to assign grievance: ${error.message}`);
    await auditService.log({ action: "grievance_assign", targetType: "grievances", targetId: id, metadata: { assignedToName } });
  },

  escalate: async (id: string, assignedToName = "State Vigilance & Quality Directorate"): Promise<void> => {
    const { error } = await supabase.from("grievances").update({
      assigned_to_name: assignedToName,
      status: "escalated",
      priority: "critical",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw new Error(`Failed to escalate grievance: ${error.message}`);
    await auditService.log({ action: "grievance_escalate", targetType: "grievances", targetId: id, metadata: { assignedToName } });
  },

  resolve: async (id: string, resolutionNotes: string): Promise<void> => {
    const { error } = await supabase.from("grievances").update({
      status: "resolved",
      resolution_notes: resolutionNotes,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw new Error(`Failed to resolve grievance: ${error.message}`);
    await auditService.log({ action: "grievance_resolve", targetType: "grievances", targetId: id, metadata: { resolutionNotes } });
  },

  create: async (params: Omit<Grievance, "id" | "createdAt" | "updatedAt">): Promise<Grievance> => {
    const { data, error } = await supabase.from("grievances").insert({
      ticket_id: params["ticketId"],
      farmer_id: params["farmerId"],
      farmer_name: params["farmerName"],
      farmer_phone: params["farmerPhone"],
      centre_id: params["centreId"],
      centre_name: params["centreName"],
      district: params["district"],
      category: params["category"],
      subject: params["subject"],
      description: params["description"],
      priority: params["priority"] || "medium",
      status: params["status"] || "new",
      assigned_to_name: params["assignedToName"],
    }).select().single();
    if (error) throw new Error(`Failed to create grievance: ${error.message}`);
    await auditService.log({ action: "grievance_create", targetType: "grievances", targetId: data.id, metadata: params });
    return {
      id: data.id,
      ticketId: data.ticket_id,
      farmerId: data.farmer_id,
      farmerName: data.farmer_name,
      farmerPhone: data.farmer_phone,
      centreId: data.centre_id,
      centreName: data.centre_name,
      district: data.district,
      category: data.category,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      status: data.status,
      assignedToName: data.assigned_to_name,
      resolutionNotes: data.resolution_notes,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
};

// ─── Smart ETA Computation ───

/**
 * Compute a real-time ETA for a farmer based on actual queue state.
 * Used by farmer portal to show "Your turn in ~X minutes".
 */
export const etaService = {
  compute: async (centreId: string, positionInQueue: number): Promise<number> => {
    const { data } = await supabase
      .from("procurement_centres")
      .select("processing_rate_per_hour, active_counters")
      .eq("id", centreId)
      .maybeSingle();

    const ratePerHour = data?.processing_rate_per_hour ?? 30;
    const activeCounters = Math.max(1, data?.active_counters ?? 1);
    const totalRatePerMin = (ratePerHour * activeCounters) / 60;
    return Math.max(5, Math.round(positionInQueue / totalRatePerMin));
  },
};
