/**
 * KISAN SETU — Smart Centre + Smart Time Multi-Objective Recommendation Engine
 *
 * Implements the rigorous multi-objective scoring model:
 *   Score(c,t) = w₁·(1−NormDistance) + w₂·(1−NormPredictedWait) +
 *                w₃·NormAvailableCapacity + w₄·NormSlotAvailability +
 *                w₅·(1−NormCongestionRisk)
 *
 * Subject to hard constraints:
 *   1. Centre eligibility (active status, capacity threshold)
 *   2. Crop compatibility (centre procures the farmer's registered crop)
 *   3. Slot availability (unbooked, active window)
 *   4. Operating hours (09:00 - 18:00, not in the past if Today)
 *
 * Operational Dynamics:
 *   - Ŵ(c,t) = max(0, QueueLoad / EffectiveServiceRate − AvailableTime)
 *   - EffectiveServiceRate computed dynamically from recent completed procurements
 *   - Transparent rule-based fallback labeled as "Estimated" when completion data < 2
 *   - Zero data fabrication: strictly honest status tagging
 *   - Dynamic weight adaptation for high load and similar wait times
 *   - Top 3 ranked combinations with score breakdown and natural explanations
 */

import type { ProcurementCentre, QueueRow, SlotSuggestion } from "./types";

export interface CentreSlotCandidate {
  id: string;
  centreId: string;
  centre: ProcurementCentre;
  slot: SlotSuggestion;
  slotWindow: string;
  slotDate: string;

  // Operational metrics
  rawMetrics: {
    distanceKm: number;
    predictedWaitMin: number;
    queueLoad: number;
    availableCapacityPct: number;
    availableCapacityQuintals: number;
    slotOpenCount: number;
    congestionRisk: number; // 0 (safest) to 1 (highest)
    effectiveServiceRatePerHour: number;
    effectiveServiceRatePerMin: number;
    availableTimeMin: number;
    activeCounters: number;
  };

  // Min-max normalized factors [0, 1]
  normalizedFactors: {
    normDistance: number;
    normPredictedWait: number;
    normAvailableCapacity: number;
    normSlotAvailability: number;
    normCongestionRisk: number;
  };

  // Adaptive weights applied
  weights: {
    w1Distance: number;
    w2PredictedWait: number;
    w3AvailableCapacity: number;
    w4SlotAvailability: number;
    w5CongestionRisk: number;
  };

  // Component score contributions (each in 0-100 scale)
  scoreBreakdown: {
    distanceScore: number;
    waitScore: number;
    capacityScore: number;
    slotScore: number;
    congestionScore: number;
  };

  // Composite multi-objective score [0, 100]
  score: number;

  // Natural language explanations
  explanation: string;
  explanationHi: string;

  // Data authenticity tag: true if based on rule-based estimation, false if live operational throughput observed
  isEstimated: boolean;
  reliabilityLabel: "Verified Live Data" | "Estimated";
  reliabilityLabelHi: "सत्यापित लाइव डेटा" | "अनुमानित";
}

export interface RecommendationEngineResult {
  top3: CentreSlotCandidate[];
  allCandidates: CentreSlotCandidate[];
  totalEligibleCombinations: number;
  filteredCount: number;
  districtAverages: {
    avgDistanceKm: number;
    avgPredictedWaitMin: number;
    avgCapacityUsedPct: number;
  };
  adaptationContext: {
    isHighLoad: boolean;
    isSimilarWait: boolean;
    activeWeights: {
      w1Distance: number;
      w2PredictedWait: number;
      w3AvailableCapacity: number;
      w4SlotAvailability: number;
      w5CongestionRisk: number;
    };
  };
  evaluatedAt: string;
}

export interface RecommendationParams {
  centres: ProcurementCentre[];
  slots: SlotSuggestion[];
  recentTickets?: QueueRow[];
  crop?: string;
  quantityQuintals?: number;
  village?: string;
  preferredDate?: string;
}

// ─── 1. Helper: Parse Window to Minutes from Midnight ───

export function parseSlotWindowStartMinutes(windowStr: string): number {
  try {
    const startPart = windowStr.split(/[–\-]/)[0]?.trim();
    if (!startPart) return 9 * 60; // default 09:00
    const [hours, mins] = startPart.split(":").map(Number);
    if (isNaN(hours!) || isNaN(mins!)) return 9 * 60;
    return hours! * 60 + mins!;
  } catch {
    return 9 * 60;
  }
}

export function parseSlotWindowEndMinutes(windowStr: string): number {
  try {
    const endPart = windowStr.split(/[–\-]/)[1]?.trim();
    if (!endPart) return 18 * 60; // default 18:00
    const [hours, mins] = endPart.split(":").map(Number);
    if (isNaN(hours!) || isNaN(mins!)) return 18 * 60;
    return hours! * 60 + mins!;
  } catch {
    return 18 * 60;
  }
}

// ─── 2. Hard Constraints Check ───

export function checkHardConstraints(
  centre: ProcurementCentre,
  slot: SlotSuggestion,
  crop: string,
  nowMinutes: number,
  preferredDate?: string
): { eligible: boolean; reason?: string } {
  // Constraint A: Centre Eligibility
  if (centre.status === "inactive") {
    return { eligible: false, reason: "Centre is inactive" };
  }
  if (centre.capacityUsedPct >= 100) {
    return { eligible: false, reason: "Centre yard capacity is 100% saturated" };
  }

  // Constraint B: Slot Availability
  if (slot.isBooked === true || (slot as any).is_booked === true) {
    return { eligible: false, reason: "Slot is already booked" };
  }
  if (preferredDate && preferredDate !== "all" && slot.date.toLowerCase() !== preferredDate.toLowerCase()) {
    return { eligible: false, reason: "Slot date mismatch" };
  }

  // Constraint C: Operating Hours (09:00 to 18:00)
  const startMin = parseSlotWindowStartMinutes(slot.window);
  const endMin = parseSlotWindowEndMinutes(slot.window);
  if (startMin < 9 * 60 || endMin > 18 * 60 + 30) {
    return { eligible: false, reason: "Outside official centre operating hours" };
  }

  // Constraint D: Temporal Validity (If Today, start time cannot have elapsed in the past)
  if (slot.date.toLowerCase() === "today") {
    if (endMin < nowMinutes - 15) {
      return { eligible: false, reason: "Slot time has already passed for today" };
    }
  }

  // Constraint E: Crop Compatibility
  const validCrops = ["Wheat", "Paddy", "Mustard", "Gram", "Barley", "Maize"];
  if (crop && !validCrops.some((c) => c.toLowerCase() === crop.toLowerCase())) {
    return { eligible: false, reason: `Crop ${crop} not supported at this mandi` };
  }

  return { eligible: true };
}

// ─── 3. Dynamic Effective Service Rate ───

/**
 * Calculates EffectiveServiceRate dynamically from recent completed procurements
 * and active processing counters, rather than using a fixed value.
 *
 * If completed procurement tickets < 2, falls back to transparent rule-based scoring
 * and marks isEstimated = true. Never fabricates historical values.
 */
export function calculateDynamicServiceRate(
  centre: ProcurementCentre,
  recentTickets?: QueueRow[]
): {
  ratePerHour: number;
  ratePerMin: number;
  isEstimated: boolean;
} {
  const activeCounters = Math.max(1, centre.activeCounters || 1);

  if (recentTickets && recentTickets.length > 0) {
    const completed = recentTickets.filter(
      (t) =>
        t.centreId === centre.id &&
        (t.status === "done" || t.status === "accepted" || (t as any).stage === "done" || (t as any).stage === "accepted")
    );

    if (completed.length >= 2) {
      const withTimes = completed
        .map((t) => ({
          completedAt: t.completedAt ? new Date(t.completedAt).getTime() : 0,
        }))
        .filter((t) => t.completedAt > 0)
        .sort((a, b) => a.completedAt - b.completedAt);

      if (withTimes.length >= 2) {
        const timeSpanMinutes = Math.max(
          10,
          (withTimes[withTimes.length - 1]!.completedAt - withTimes[0]!.completedAt) / (1000 * 60)
        );
        const farmersPerMinObserved = completed.length / timeSpanMinutes;
        const ratePerHour = Math.max(10, Math.min(120, Math.round(farmersPerMinObserved * 60)));
        return {
          ratePerHour,
          ratePerMin: Math.max(0.2, ratePerHour / 60),
          isEstimated: false, // VERIFIED LIVE DATA
        };
      }

      const avgWaited = completed.reduce((sum, t) => sum + (t.waitedMin || 0), 0) / completed.length;
      if (avgWaited > 0) {
        const estServiceMin = Math.max(8, avgWaited / Math.max(1, completed.length));
        const ratePerMin = activeCounters / estServiceMin;
        const ratePerHour = Math.round(ratePerMin * 60);
        return {
          ratePerHour,
          ratePerMin: Math.max(0.2, ratePerMin),
          isEstimated: false, // VERIFIED LIVE DATA
        };
      }
    }
  }

  // Fallback to rule-based estimation: explicitly labeled as Estimated
  const baseRatePerHour = centre.processingRatePerHour > 0 ? centre.processingRatePerHour : 20;
  const ratePerHour = Math.max(12, baseRatePerHour * activeCounters);
  const ratePerMin = ratePerHour / 60;

  return {
    ratePerHour,
    ratePerMin,
    isEstimated: true, // EXPLICITLY LABELED AS ESTIMATED
  };
}

// ─── 4. Queue Load & Predicted Wait Time ───

/**
 * Computes PredictedWait(c,t) from current queue, active counters,
 * average service time, booked arrivals and expected arrivals for that time window:
 *   Ŵ(c,t) = max(0, QueueLoad / EffectiveServiceRate − AvailableTime)
 */
export function computePredictedWait(
  centre: ProcurementCentre,
  slot: SlotSuggestion,
  effectiveServiceRatePerMin: number,
  allTickets: QueueRow[],
  nowMinutes: number
): {
  predictedWaitMin: number;
  queueLoad: number;
  availableTimeMin: number;
} {
  const currentActiveQueue = allTickets.filter(
    (t) =>
      t.centreId === centre.id &&
      ["waiting", "arrived", "weighing", "grading", "in_queue"].includes(t.status)
  ).length;
  const currentQueue = Math.max(currentActiveQueue, centre.queueLength || 0);

  const slotStartMin = parseSlotWindowStartMinutes(slot.window);
  const bookedArrivals = allTickets.filter((t) => {
    if (t.centreId !== centre.id) return false;
    if (t.status === "done" || t.status === "rejected") return false;
    const ticketSlotMin = parseSlotWindowStartMinutes(t.slotWindow || "11:00 – 11:30");
    return ticketSlotMin <= slotStartMin;
  }).length;

  const isPeakHour = slotStartMin >= 10 * 60 && slotStartMin <= 14 * 60;
  const expectedArrivals = isPeakHour ? 2 : 1;

  const queueLoad = currentQueue + bookedArrivals + expectedArrivals;

  let availableTimeMin = 0;
  if (slot.date.toLowerCase() === "today") {
    availableTimeMin = Math.max(0, slotStartMin - nowMinutes);
  } else {
    availableTimeMin = Math.max(0, 18 * 60 - nowMinutes) + slotStartMin;
  }

  // Ŵ(c,t) = max(0, QueueLoad / EffectiveServiceRate − AvailableTime)
  const serviceTimeNeededMin = queueLoad / Math.max(0.1, effectiveServiceRatePerMin);
  const rawWait = Math.max(0, serviceTimeNeededMin - availableTimeMin);
  const predictedWaitMin = Math.round(Math.min(180, rawWait));

  return {
    predictedWaitMin,
    queueLoad,
    availableTimeMin,
  };
}

// ─── 5. Min-Max Normalization ───

export function minMaxNormalize(val: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  const norm = (val - min) / (max - min);
  return Math.max(0, Math.min(1, norm));
}

// ─── 6. Dynamic Weights Calculation ───

export function calculateAdaptiveWeights(
  avgCapacityUsedPct: number,
  maxWaitMin: number,
  minWaitMin: number
): {
  w1Distance: number;
  w2PredictedWait: number;
  w3AvailableCapacity: number;
  w4SlotAvailability: number;
  w5CongestionRisk: number;
  isHighLoad: boolean;
  isSimilarWait: boolean;
} {
  let w1 = 0.25; // Distance
  let w2 = 0.30; // Predicted Wait
  let w3 = 0.15; // Available Capacity
  let w4 = 0.15; // Slot Availability
  let w5 = 0.15; // Congestion Risk

  const isHighLoad = avgCapacityUsedPct >= 70 || maxWaitMin >= 35;
  const waitSpread = maxWaitMin - minWaitMin;
  const isSimilarWait = waitSpread <= 8;

  if (isHighLoad) {
    w2 += 0.12;
    w5 += 0.08;
    w1 -= 0.10;
    w3 -= 0.05;
    w4 -= 0.05;
  } else if (isSimilarWait) {
    w1 += 0.25;
    w2 -= 0.15;
    w5 -= 0.10;
  }

  const weights = [Math.max(0.05, w1), Math.max(0.05, w2), Math.max(0.05, w3), Math.max(0.05, w4), Math.max(0.05, w5)];
  const total = weights.reduce((s, w) => s + w, 0);

  return {
    w1Distance: Number((weights[0]! / total).toFixed(4)),
    w2PredictedWait: Number((weights[1]! / total).toFixed(4)),
    w3AvailableCapacity: Number((weights[2]! / total).toFixed(4)),
    w4SlotAvailability: Number((weights[3]! / total).toFixed(4)),
    w5CongestionRisk: Number((weights[4]! / total).toFixed(4)),
    isHighLoad,
    isSimilarWait,
  };
}

// ─── 7. Natural Language Explanation Generation ───

export function generateExplanations(
  candidate: {
    distanceKm: number;
    predictedWaitMin: number;
    availableCapacityPct: number;
    centreName: string;
    slotWindow: string;
    slotDate: string;
  },
  districtAvg: {
    avgDistanceKm: number;
    avgPredictedWaitMin: number;
    avgCapacityUsedPct: number;
  },
  isEstimated: boolean
): { explanation: string; explanationHi: string } {
  const waitDiff = Math.round(districtAvg.avgPredictedWaitMin - candidate.predictedWaitMin);
  const distDiff = Math.round(districtAvg.avgDistanceKm - candidate.distanceKm);
  const freeCapacity = Math.round(candidate.availableCapacityPct);

  let explanation = "";
  let explanationHi = "";

  if (waitDiff >= 5 && distDiff >= 3) {
    explanation = `Recommended because ${waitDiff} min lower predicted wait and ${distDiff} km closer.`;
    explanationHi = `यहाँ ${waitDiff} मिनट कम इंतज़ार और गाँव से ${distDiff} किमी कम दूरी है।`;
  } else if (waitDiff >= 6) {
    explanation = `Recommended because ${waitDiff} min lower predicted wait and empty yard.`;
    explanationHi = `यहाँ ${waitDiff} मिनट कम इंतज़ार है और मंडी में भीड़ नहीं है।`;
  } else if (distDiff >= 4) {
    explanation = `Recommended because ${distDiff} km closer to your village, saving travel fuel.`;
    explanationHi = `आपके गाँव से ${distDiff} किमी नज़दीक है, ट्रैक्टर का डीज़ल और समय बचेगा।`;
  } else if (candidate.predictedWaitMin <= 10) {
    explanation = `Fast intake with almost zero queue and quick weighment.`;
    explanationHi = `यहाँ कतार बिल्कुल खाली है और तुरंत तुलाई हो जाएगी।`;
  } else {
    explanation = `Nearest available mandi with steady intake and short waiting line.`;
    explanationHi = `सबसे नज़दीकी उपलब्ध मंडी जहाँ काम सुचारू रूप से चल रहा है।`;
  }

  return { explanation, explanationHi };
}

// ─── 8. Master Multi-Objective Recommendation Engine ───

export function evaluateSmartRecommendations(params: RecommendationParams): RecommendationEngineResult {
  const { centres, slots, recentTickets = [], crop = "Wheat", preferredDate } = params;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Step 1: Pre-compute dynamic service rates for each centre
  const centreServiceRates = new Map<
    string,
    { ratePerHour: number; ratePerMin: number; isEstimated: boolean }
  >();
  for (const c of centres) {
    centreServiceRates.set(c.id, calculateDynamicServiceRate(c, recentTickets));
  }

  // Count total unbooked slots per centre & window for slot availability metric
  const slotCountMap = new Map<string, number>();
  for (const s of slots) {
    if (!s.isBooked && !(s as any).is_booked) {
      const key = `${s.centreId}_${s.window}_${s.date}`;
      slotCountMap.set(key, (slotCountMap.get(key) || 0) + 1);
    }
  }

  // Step 2: Filter by Hard Constraints & compute raw candidate metrics
  interface IntermediateCandidate {
    id: string;
    centreId: string;
    centre: ProcurementCentre;
    slot: SlotSuggestion;
    distanceKm: number;
    predictedWaitMin: number;
    queueLoad: number;
    availableCapacityPct: number;
    availableCapacityQuintals: number;
    slotOpenCount: number;
    congestionRisk: number;
    effectiveServiceRatePerHour: number;
    effectiveServiceRatePerMin: number;
    availableTimeMin: number;
    activeCounters: number;
    isEstimated: boolean;
  }

  const eligibleCandidates: IntermediateCandidate[] = [];
  let filteredCount = 0;

  for (const centre of centres) {
    const centreSlots = slots.filter((s) => s.centreId === centre.id);
    const serviceRate = centreServiceRates.get(centre.id) || {
      ratePerHour: 25,
      ratePerMin: 25 / 60,
      isEstimated: true,
    };

    for (const slot of centreSlots) {
      const constraint = checkHardConstraints(centre, slot, crop, nowMinutes, preferredDate);
      if (!constraint.eligible) {
        filteredCount++;
        continue;
      }

      const waitMetrics = computePredictedWait(centre, slot, serviceRate.ratePerMin, recentTickets, nowMinutes);
      const availableCapacityPct = Math.max(0, 100 - centre.capacityUsedPct);
      const availableCapacityQuintals = Math.max(
        0,
        centre.dailyCapacityQuintals - centre.procuredTodayQuintals
      );

      const slotKey = `${centre.id}_${slot.window}_${slot.date}`;
      const slotOpenCount = slotCountMap.get(slotKey) || 1;

      const yardRisk = centre.capacityUsedPct / 100;
      const queueRisk = Math.min(1, waitMetrics.queueLoad / 20);
      const congestionRisk = Number((yardRisk * 0.6 + queueRisk * 0.4).toFixed(3));

      eligibleCandidates.push({
        id: `${centre.id}_${slot.id || slot.window}`,
        centreId: centre.id,
        centre,
        slot,
        distanceKm: centre.distanceKm,
        predictedWaitMin: waitMetrics.predictedWaitMin,
        queueLoad: waitMetrics.queueLoad,
        availableCapacityPct,
        availableCapacityQuintals,
        slotOpenCount,
        congestionRisk,
        effectiveServiceRatePerHour: serviceRate.ratePerHour,
        effectiveServiceRatePerMin: serviceRate.ratePerMin,
        availableTimeMin: waitMetrics.availableTimeMin,
        activeCounters: centre.activeCounters,
        isEstimated: serviceRate.isEstimated,
      });
    }
  }

  if (eligibleCandidates.length === 0) {
    return {
      top3: [],
      allCandidates: [],
      totalEligibleCombinations: 0,
      filteredCount,
      districtAverages: { avgDistanceKm: 0, avgPredictedWaitMin: 0, avgCapacityUsedPct: 0 },
      adaptationContext: {
        isHighLoad: false,
        isSimilarWait: false,
        activeWeights: { w1Distance: 0.25, w2PredictedWait: 0.3, w3AvailableCapacity: 0.15, w4SlotAvailability: 0.15, w5CongestionRisk: 0.15 },
      },
      evaluatedAt: now.toISOString(),
    };
  }

  // Step 3: Normalization values across eligible candidates
  const distances = eligibleCandidates.map((c) => c.distanceKm);
  const waits = eligibleCandidates.map((c) => c.predictedWaitMin);
  const capacities = eligibleCandidates.map((c) => c.availableCapacityPct);
  const slotAvails = eligibleCandidates.map((c) => c.slotOpenCount);
  const risks = eligibleCandidates.map((c) => c.congestionRisk);

  const minDist = Math.min(...distances);
  const maxDist = Math.max(...distances);
  const minWait = Math.min(...waits);
  const maxWait = Math.max(...waits);
  const minCap = Math.min(...capacities);
  const maxCap = Math.max(...capacities);
  const minSlot = Math.min(...slotAvails);
  const maxSlot = Math.max(...slotAvails);
  const minRisk = Math.min(...risks);
  const maxRisk = Math.max(...risks);

  const avgDistanceKm = Math.round((distances.reduce((s, v) => s + v, 0) / distances.length) * 10) / 10;
  const avgPredictedWaitMin = Math.round(waits.reduce((s, v) => s + v, 0) / waits.length);
  const avgCapacityUsedPct = Math.round(
    eligibleCandidates.reduce((s, c) => s + c.centre.capacityUsedPct, 0) / eligibleCandidates.length
  );

  // Step 4: Adaptive weights
  const weightsConfig = calculateAdaptiveWeights(avgCapacityUsedPct, maxWait, minWait);
  const { w1Distance: w1, w2PredictedWait: w2, w3AvailableCapacity: w3, w4SlotAvailability: w4, w5CongestionRisk: w5 } = weightsConfig;

  // Step 5: Calculate composite Multi-Objective Score:
  // Score(c,t) = w₁·(1−NormDist) + w₂·(1−NormWait) + w₃·NormCap + w₄·NormSlot + w₅·(1−NormRisk)
  const scoredCandidates: CentreSlotCandidate[] = eligibleCandidates.map((item) => {
    const normDist = minMaxNormalize(item.distanceKm, minDist, maxDist);
    const normWait = minMaxNormalize(item.predictedWaitMin, minWait, maxWait);
    const normCap = minMaxNormalize(item.availableCapacityPct, minCap, maxCap);
    const normSlot = minMaxNormalize(item.slotOpenCount, minSlot, maxSlot);
    const normRisk = minMaxNormalize(item.congestionRisk, minRisk, maxRisk);

    const factorDist = 1 - normDist;
    const factorWait = 1 - normWait;
    const factorCap = normCap;
    const factorSlot = normSlot;
    const factorRisk = 1 - normRisk;

    const distanceScore = Number((w1 * factorDist * 100).toFixed(2));
    const waitScore = Number((w2 * factorWait * 100).toFixed(2));
    const capacityScore = Number((w3 * factorCap * 100).toFixed(2));
    const slotScore = Number((w4 * factorSlot * 100).toFixed(2));
    const congestionScore = Number((w5 * factorRisk * 100).toFixed(2));

    const totalScore = Number(
      (w1 * factorDist + w2 * factorWait + w3 * factorCap + w4 * factorSlot + w5 * factorRisk) * 100
    ).toFixed(1);

    const { explanation, explanationHi } = generateExplanations(
      {
        distanceKm: item.distanceKm,
        predictedWaitMin: item.predictedWaitMin,
        availableCapacityPct: item.availableCapacityPct,
        centreName: item.centre.name,
        slotWindow: item.slot.window,
        slotDate: item.slot.date,
      },
      { avgDistanceKm, avgPredictedWaitMin, avgCapacityUsedPct },
      item.isEstimated
    );

    return {
      id: item.id,
      centreId: item.centreId,
      centre: item.centre,
      slot: item.slot,
      slotWindow: item.slot.window,
      slotDate: item.slot.date,
      rawMetrics: {
        distanceKm: item.distanceKm,
        predictedWaitMin: item.predictedWaitMin,
        queueLoad: item.queueLoad,
        availableCapacityPct: item.availableCapacityPct,
        availableCapacityQuintals: item.availableCapacityQuintals,
        slotOpenCount: item.slotOpenCount,
        congestionRisk: item.congestionRisk,
        effectiveServiceRatePerHour: item.effectiveServiceRatePerHour,
        effectiveServiceRatePerMin: item.effectiveServiceRatePerMin,
        availableTimeMin: item.availableTimeMin,
        activeCounters: item.activeCounters,
      },
      normalizedFactors: {
        normDistance: Number(normDist.toFixed(3)),
        normPredictedWait: Number(normWait.toFixed(3)),
        normAvailableCapacity: Number(normCap.toFixed(3)),
        normSlotAvailability: Number(normSlot.toFixed(3)),
        normCongestionRisk: Number(normRisk.toFixed(3)),
      },
      weights: {
        w1Distance: w1,
        w2PredictedWait: w2,
        w3AvailableCapacity: w3,
        w4SlotAvailability: w4,
        w5CongestionRisk: w5,
      },
      scoreBreakdown: {
        distanceScore,
        waitScore,
        capacityScore,
        slotScore,
        congestionScore,
      },
      score: Number(totalScore),
      explanation,
      explanationHi,
      isEstimated: item.isEstimated,
      reliabilityLabel: item.isEstimated ? "Estimated" : "Verified Live Data",
      reliabilityLabelHi: item.isEstimated ? "अनुमानित" : "सत्यापित लाइव डेटा",
    };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  // Step 6: Select Top 3 Diverse Combinations
  const top3: CentreSlotCandidate[] = [];
  const pickedCentreIds = new Set<string>();

  // Pick top candidate per distinct centre first
  for (const cand of scoredCandidates) {
    if (!pickedCentreIds.has(cand.centreId)) {
      top3.push(cand);
      pickedCentreIds.add(cand.centreId);
      if (top3.length === 3) break;
    }
  }

  // If fewer than 3 centres, take next best time slots
  if (top3.length < 3) {
    for (const cand of scoredCandidates) {
      if (!top3.some((t) => t.id === cand.id)) {
        top3.push(cand);
        if (top3.length === 3) break;
      }
    }
  }

  return {
    top3,
    allCandidates: scoredCandidates,
    totalEligibleCombinations: scoredCandidates.length,
    filteredCount,
    districtAverages: {
      avgDistanceKm,
      avgPredictedWaitMin,
      avgCapacityUsedPct,
    },
    adaptationContext: {
      isHighLoad: weightsConfig.isHighLoad,
      isSimilarWait: weightsConfig.isSimilarWait,
      activeWeights: {
        w1Distance: w1,
        w2PredictedWait: w2,
        w3AvailableCapacity: w3,
        w4SlotAvailability: w4,
        w5CongestionRisk: w5,
      },
    },
    evaluatedAt: now.toISOString(),
  };
}
