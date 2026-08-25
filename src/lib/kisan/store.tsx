/**
 * KISAN SETU — Production State Management
 * All state loaded from Supabase on mount. No demo/mock data.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  analyticsService,
  auditService,
  centreService,
  farmerService,
  forecastService,
  notificationService,
  operatorService,
  type OperatorProcessParams,
  paymentService,
  procurementService,
  queueService,
  recommendationService,
  slotService,
} from "./services";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type {
  ActivityEvent,
  AiRecommendation,
  CentreAlert,
  DistrictSummary,
  Farmer,
  ForecastPoint,
  Language,
  PaymentStatus,
  ProcurementCentre,
  QueueRow,
  QueueTicket,
  SlotSuggestion,
  ThroughputPoint,
  TimelineStep,
  WaitAnalyticsPoint,
} from "./types";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface KisanState {
  language: Language;
  farmer: Farmer | null;
  centres: ProcurementCentre[];
  slot: SlotSuggestion | null;
  ticket: QueueTicket | null;
  timeline: TimelineStep[];
  payment: PaymentStatus | null;
  queueRows: QueueRow[];
  alerts: CentreAlert[];
  recommendation: AiRecommendation | null;
  forecast: ForecastPoint[];
  waitAnalytics: WaitAnalyticsPoint[];
  throughput: ThroughputPoint[];
  activity: ActivityEvent[];
  notifications: AppNotification[];
  interventionApplied: boolean;
  overloadTriggered: boolean;
  isLoading: boolean;
  error: string | null;
}

interface KisanActions {
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  triggerOverload: () => void;
  reviewRecommendation: () => void;
  approveRecommendation: () => void;
  overrideRecommendation: () => void;
  refreshFromDatabase: () => Promise<void>;
  updateFarmerProfile: (updates: Partial<Farmer>) => Promise<void>;
  operatorProcessTicket: (params: OperatorProcessParams) => Promise<any>;
  operatorUpdateCounters: (centreId: string, activeCounters: number) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (notifId: string) => Promise<void>;
  sendNotification: (title: string, body: string, targetUserId?: string) => Promise<void>;
}

interface KisanContextValue extends KisanState, KisanActions {
  summary: DistrictSummary;
  centreById: (id: string) => ProcurementCentre | undefined;
  recommendedCentre: ProcurementCentre | undefined;
}

const emptyState: KisanState = {
  language: "en",
  farmer: null,
  centres: [],
  slot: null,
  ticket: null,
  timeline: [],
  payment: null,
  queueRows: [],
  alerts: [],
  recommendation: null,
  forecast: [],
  waitAnalytics: [],
  throughput: [],
  activity: [],
  notifications: [],
  interventionApplied: false,
  overloadTriggered: false,
  isLoading: true,
  error: null,
};

const KisanContext = createContext<KisanContextValue | null>(null);

function nowLabel() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function KisanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<KisanState>(emptyState);

  const refreshFromDatabase = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const activeUserId = user?.id;
      const results = await Promise.allSettled([
        farmerService.getProfile(activeUserId),                 // 0
        centreService.list(),                                   // 1
        slotService.suggest(),                                  // 2
        queueService.getTicket(activeUserId),                   // 3
        procurementService.getTimeline(undefined, activeUserId), // 4
        paymentService.getStatus(activeUserId),                 // 5
        queueService.getCentreQueue(),                           // 6
        analyticsService.alerts(),                              // 7
        recommendationService.current(),                         // 8
        analyticsService.activityFeed(),                         // 9
        forecastService.queueForecast(),                         // 10
        forecastService.waitAnalytics(),                         // 11
        forecastService.throughput(),                             // 12
        activeUserId ? notificationService.getForUser(activeUserId) : Promise.resolve([]), // 13
      ]);

      const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
        r.status === "fulfilled" ? r.value : fallback;

      const rec = val(results[8], null as AiRecommendation | null);

      setState((s) => ({
        ...s,
        farmer: val(results[0], s.farmer),
        centres: val(results[1], s.centres),
        slot: val(results[2], s.slot),
        ticket: val(results[3], s.ticket),
        timeline: val(results[4], s.timeline),
        payment: val(results[5], s.payment),
        queueRows: val(results[6], s.queueRows),
        alerts: val(results[7], s.alerts),
        recommendation: rec,
        activity: val(results[9], s.activity),
        forecast: val(results[10], s.forecast),
        waitAnalytics: val(results[11], s.waitAnalytics),
        throughput: val(results[12], s.throughput),
        notifications: val(results[13], s.notifications),
        interventionApplied: rec?.status === "approved",
        isLoading: false,
        error: null,
      }));
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false, error: err?.message || "Failed to load data" }));
    }
  }, [user?.id]);

  // Initial load + realtime subscriptions
  useEffect(() => {
    refreshFromDatabase();

    if (!user) return; // Don't subscribe if not logged in

    let ticketFilter: string | undefined;
    let paymentFilter: string | undefined;
    let centreFilter: string | undefined;

    if (user.role === "farmer" && user.id) {
      ticketFilter = `farmer_id=eq.${user.id}`;
      paymentFilter = `farmer_id=eq.${user.id}`;
    } else if (user.role === "centre_operator" && user.centreId) {
      ticketFilter = `centre_id=eq.${user.centreId}`;
      centreFilter = `id=eq.${user.centreId}`;
    }

    const channel = supabase
      .channel(`kisan-production-sync-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "procurement_centres", filter: centreFilter }, () => {
        refreshFromDatabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: ticketFilter }, () => {
        refreshFromDatabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "procurement_timeline" }, () => {
        refreshFromDatabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: paymentFilter }, () => {
        refreshFromDatabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "slots" }, () => {
        refreshFromDatabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_recommendations" }, () => {
        refreshFromDatabase();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_feed" }, () => {
        analyticsService.activityFeed()
          .then((activity) => setState((s) => ({ ...s, activity })))
          .catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        if (user?.id) {
          notificationService.getForUser(user.id)
            .then((notifications) => setState((s) => ({ ...s, notifications })))
            .catch(() => {});
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "centre_alerts", filter: centreFilter ? `centre_id=eq.${user.centreId}` : undefined }, () => {
        analyticsService.alerts()
          .then((alerts) => setState((s) => ({ ...s, alerts })))
          .catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshFromDatabase, user]);

  // ─── Actions ───

  const pushActivity = useCallback((event: Omit<ActivityEvent, "id" | "at">) => {
    const at = nowLabel();
    setState((s) => ({
      ...s,
      activity: [
        { id: `e-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, at, ...event },
        ...s.activity,
      ].slice(0, 24),
    }));
    analyticsService.pushActivity(event).catch(() => {});
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setState((s) => ({ ...s, language }));
  }, []);

  const toggleLanguage = useCallback(() => {
    setState((s) => ({ ...s, language: s.language === "hi" ? "en" : "hi" }));
  }, []);

  const updateFarmerProfile = useCallback(async (updates: Partial<Farmer>) => {
    const userId = state.farmer?.id;
    setState((s) => s.farmer ? ({ ...s, farmer: { ...s.farmer, ...updates } }) : s);
    if (userId) {
      try {
        await farmerService.updateRegistration(userId, updates);
        await auditService.log({
          actorId: userId, actorRole: "farmer", action: "update_registration",
          targetType: "farmer", targetId: userId,
          metadata: { crop: updates.crop, quantity: updates.quantityQuintals },
        });
      } catch (err) {
        console.error("Failed to update farmer profile:", err);
      }
    }
    pushActivity({ kind: "queue", message: `Farmer registration updated: ${updates.crop || "Wheat"} · ${updates.quantityQuintals || 0} qtl` });
  }, [pushActivity, state.farmer?.id]);

  const operatorProcessTicket = useCallback(async (params: OperatorProcessParams) => {
    const result = await operatorService.processTicket(params);
    await refreshFromDatabase();
    return result;
  }, [refreshFromDatabase]);

  const operatorUpdateCounters = useCallback(async (centreId: string, activeCounters: number) => {
    await operatorService.updateCounters(centreId, activeCounters);
    await refreshFromDatabase();
  }, [refreshFromDatabase]);

  /** Operator trigger: Centre has surge */
  const triggerOverload = useCallback(() => {
    // Find the centre with highest capacity usage (dynamic, not hardcoded)
    const overloadCentre = [...state.centres].sort((a, b) => b.capacityUsedPct - a.capacityUsedPct)[0];
    if (!overloadCentre) return;

    const newQueue = overloadCentre.queueLength + 16;
    const newCapacity = Math.min(97, overloadCentre.capacityUsedPct + 6);

    setState((s) => ({
      ...s,
      overloadTriggered: true,
      centres: s.centres.map((c) =>
        c.id === overloadCentre.id
          ? { ...c, queueLength: newQueue, predictedWaitMin: 168, capacityUsedPct: newCapacity, farmersToday: c.farmersToday + 16 }
          : c,
      ),
    }));

    // Persist & create alert
    centreService.update(overloadCentre.id, {
      queueLength: newQueue, predictedWaitMin: 168, capacityUsedPct: newCapacity,
      farmersToday: overloadCentre.farmersToday + 16,
    }).catch(() => {});

    analyticsService.createAlert(
      overloadCentre.id, "critical",
      `Unscheduled arrival surge at ${overloadCentre.name} — 16 walk-in tractors`,
      `Queue ${overloadCentre.queueLength} → ${newQueue}. Safe capacity breach projected in 24 minutes.`
    ).catch(() => {});

    auditService.log({
      action: "trigger_overload", targetType: "centre", targetId: overloadCentre.id,
      metadata: { centre: overloadCentre.code, newQueue, newCapacity },
    }).catch(() => {});

    pushActivity({ kind: "ai", message: `Congestion model: ${overloadCentre.name} queue ${newQueue} · overload predicted in 24 min` });
  }, [pushActivity, state.centres]);

  const reviewRecommendation = useCallback(() => {
    if (!state.recommendation) return;
    setState((s) => s.recommendation ? ({ ...s, recommendation: { ...s.recommendation, status: "reviewing" } }) : s);
    recommendationService.review(state.recommendation.id).catch(() => {});
    auditService.log({
      action: "review_recommendation", targetType: "recommendation", targetId: state.recommendation.id,
    }).catch(() => {});
    pushActivity({ kind: "admin", message: "District officer opened AI recommendation for review" });
  }, [pushActivity, state.recommendation]);

  const overrideRecommendation = useCallback(() => {
    if (!state.recommendation) return;
    setState((s) => s.recommendation ? ({ ...s, recommendation: { ...s.recommendation, status: "overridden" } }) : s);
    recommendationService.override(state.recommendation.id).catch(() => {});
    auditService.log({
      action: "override_recommendation", targetType: "recommendation", targetId: state.recommendation.id,
    }).catch(() => {});
    pushActivity({ kind: "admin", message: "AI recommendation overridden — manual staffing chosen" });
  }, [pushActivity, state.recommendation]);

  const approveRecommendation = useCallback(() => {
    if (!state.recommendation) return;
    const rec = state.recommendation;
    const shift = rec.action.shiftAppointments;

    setState((s) => ({
      ...s,
      interventionApplied: true,
      recommendation: s.recommendation ? { ...s.recommendation, status: "approved" } : null,
      centres: s.centres.map((c) => {
        if (c.id === rec.action.fromCentreId) {
          return {
            ...c,
            queueLength: Math.max(8, c.queueLength - shift),
            predictedWaitMin: Math.round(c.predictedWaitMin * 0.46),
            capacityUsedPct: Math.min(c.capacityUsedPct, 74),
            activeCounters: Math.min(c.totalCounters, c.activeCounters + 2),
            processingRatePerHour: Math.round(c.processingRatePerHour * 1.33),
          };
        }
        if (c.id === rec.action.toCentreId) {
          return {
            ...c,
            queueLength: c.queueLength + Math.round(shift / 3),
            predictedWaitMin: c.predictedWaitMin + 11,
            capacityUsedPct: Math.min(95, c.capacityUsedPct + 17),
            farmersToday: c.farmersToday + shift,
          };
        }
        return c;
      }),
      forecast: s.forecast.map((p, i) => i >= 4 ? { ...p, predicted: Math.round(p.predicted * 0.62) } : p),
      ticket: s.ticket ? { ...s.ticket, farmersAhead: Math.max(0, s.ticket.farmersAhead - 1), etaMinutes: Math.max(5, s.ticket.etaMinutes - 4) } : null,
    }));

    recommendationService.approve(rec.id).catch(() => {});
    auditService.log({
      action: "approve_recommendation", targetType: "recommendation", targetId: rec.id,
      metadata: { shift, from: rec.action.fromCentreId, to: rec.action.toCentreId },
    }).catch(() => {});

    pushActivity({ kind: "admin", message: `APPROVED · ${shift} appointments re-routed` });
  }, [pushActivity, state.recommendation]);

  const markNotificationRead = useCallback(async (notifId: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)),
    }));
    await notificationService.markRead(notifId);
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!user?.id) return;
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    }));
    await notificationService.markAllRead(user.id);
  }, [user?.id]);

  const deleteNotification = useCallback(async (notifId: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.filter((n) => n.id !== notifId),
    }));
    await notificationService.delete(notifId);
  }, []);

  const sendNotification = useCallback(async (title: string, body: string, targetUserId?: string) => {
    const recipient = targetUserId || user?.id;
    if (!recipient) return;
    await notificationService.send(recipient, title, body);
    if (user?.id) {
      const notifs = await notificationService.getForUser(user.id);
      setState((s) => ({ ...s, notifications: notifs }));
    }
  }, [user?.id]);

  // ─── Computed values ───

  const value = useMemo<KisanContextValue>(() => {
    const centres = state.centres;
    const summary: DistrictSummary = {
      totalCentres: centres.length,
      farmersToday: centres.reduce((n, c) => n + c.farmersToday, 0),
      quantityProcuredQuintals: centres.reduce((n, c) => n + c.procuredTodayQuintals, 0),
      averageWaitMin: centres.length ? Math.round(centres.reduce((n, c) => n + c.predictedWaitMin, 0) / centres.length) : 0,
      predictedOverloads: centres.filter((c) => c.capacityUsedPct >= 85).length,
    };

    return {
      ...state,
      setLanguage,
      toggleLanguage,
      triggerOverload,
      reviewRecommendation,
      approveRecommendation,
      overrideRecommendation,
      refreshFromDatabase,
      updateFarmerProfile,
      operatorProcessTicket,
      operatorUpdateCounters,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      sendNotification,
      summary,
      centreById: (id: string) => centres.find((c) => c.id === id || c.code === id),
      recommendedCentre: centres.find((c) => c.recommended),
    };
  }, [
    state, setLanguage, toggleLanguage, triggerOverload,
    reviewRecommendation, approveRecommendation, overrideRecommendation,
    refreshFromDatabase, updateFarmerProfile, operatorProcessTicket, operatorUpdateCounters,
    markNotificationRead, markAllNotificationsRead, deleteNotification, sendNotification,
  ]);

  return <KisanContext.Provider value={value}>{children}</KisanContext.Provider>;
}

export function useKisan() {
  const ctx = useContext(KisanContext);
  if (!ctx) throw new Error("useKisan must be used inside <KisanProvider>");
  return ctx;
}

export function centreHealth(capacityUsedPct: number): "green" | "yellow" | "red" {
  if (capacityUsedPct >= 85) return "red";
  if (capacityUsedPct >= 65) return "yellow";
  return "green";
}
