import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  demoActivity,
  demoAlerts,
  demoCentres,
  demoFarmer,
  demoForecast,
  demoPayment,
  demoQueueRows,
  demoRecommendation,
  demoSlot,
  demoThroughput,
  demoTicket,
  demoTimeline,
  demoWaitAnalytics,
} from "./demo-data";
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

/**
 * Single shared frontend demo state for all three role experiences.
 * The farmer app, the centre dashboard and the district control tower read from
 * this store, so an intervention approved in one screen is visible in the others.
 */

interface KisanState {
  language: Language;
  farmer: Farmer;
  centres: ProcurementCentre[];
  slot: SlotSuggestion;
  ticket: QueueTicket;
  timeline: TimelineStep[];
  payment: PaymentStatus;
  queueRows: QueueRow[];
  alerts: CentreAlert[];
  recommendation: AiRecommendation;
  forecast: ForecastPoint[];
  waitAnalytics: WaitAnalyticsPoint[];
  throughput: ThroughputPoint[];
  activity: ActivityEvent[];
  interventionApplied: boolean;
  overloadTriggered: boolean;
}

interface KisanActions {
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  triggerOverload: () => void;
  reviewRecommendation: () => void;
  approveRecommendation: () => void;
  overrideRecommendation: () => void;
  resetSimulation: () => void;
}

interface KisanContextValue extends KisanState, KisanActions {
  summary: DistrictSummary;
  centreById: (id: string) => ProcurementCentre | undefined;
  recommendedCentre: ProcurementCentre | undefined;
}

const initialState: KisanState = {
  language: "hi",
  farmer: demoFarmer,
  centres: demoCentres,
  slot: demoSlot,
  ticket: demoTicket,
  timeline: demoTimeline,
  payment: demoPayment,
  queueRows: demoQueueRows,
  alerts: demoAlerts,
  recommendation: demoRecommendation,
  forecast: demoForecast,
  waitAnalytics: demoWaitAnalytics,
  throughput: demoThroughput,
  activity: demoActivity,
  interventionApplied: false,
  overloadTriggered: false,
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
  const [state, setState] = useState<KisanState>(initialState);

  const pushActivity = useCallback((event: Omit<ActivityEvent, "id" | "at">) => {
    setState((s) => ({
      ...s,
      activity: [
        { id: `e-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, at: nowLabel(), ...event },
        ...s.activity,
      ].slice(0, 24),
    }));
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setState((s) => ({ ...s, language }));
  }, []);

  const toggleLanguage = useCallback(() => {
    setState((s) => ({ ...s, language: s.language === "hi" ? "en" : "hi" }));
  }, []);

  /** Demo event step 1: Centre A tips into overload and the model flags it. */
  const triggerOverload = useCallback(() => {
    setState((s) => ({
      ...s,
      overloadTriggered: true,
      centres: s.centres.map((c) =>
        c.id === "centre-a"
          ? {
              ...c,
              queueLength: 58,
              predictedWaitMin: 168,
              capacityUsedPct: 97,
              farmersToday: c.farmersToday + 16,
            }
          : c,
      ),
      alerts: s.alerts.some((a) => a.id === "alert-surge")
        ? s.alerts
        : [
            {
              id: "alert-surge",
              severity: "critical" as const,
              title: "Unscheduled arrival surge at Centre A — 16 walk-in tractors",
              detail: "Queue 42 → 58. Safe capacity breach now projected in 24 minutes.",
              atMinutes: 24,
            },
            ...s.alerts,
          ],
    }));
    pushActivity({ kind: "ai", message: "Congestion model: Centre A queue 58 · overload predicted in 24 min" });
  }, [pushActivity]);

  const reviewRecommendation = useCallback(() => {
    setState((s) => ({ ...s, recommendation: { ...s.recommendation, status: "reviewing" } }));
    pushActivity({ kind: "admin", message: "District officer opened AI recommendation REC-1 for review" });
  }, [pushActivity]);

  const overrideRecommendation = useCallback(() => {
    setState((s) => ({ ...s, recommendation: { ...s.recommendation, status: "overridden" } }));
    pushActivity({ kind: "admin", message: "AI recommendation REC-1 overridden — manual staffing chosen" });
  }, [pushActivity]);

  /** Demo event step 2: admin approves — capacities, queues and waits update everywhere. */
  const approveRecommendation = useCallback(() => {
    setState((s) => {
      const shift = s.recommendation.action.shiftAppointments;
      return {
        ...s,
        interventionApplied: true,
        recommendation: { ...s.recommendation, status: "approved" },
        centres: s.centres.map((c) => {
          if (c.id === "centre-a") {
            return {
              ...c,
              queueLength: Math.max(8, c.queueLength - shift),
              predictedWaitMin: 58,
              capacityUsedPct: 74,
              activeCounters: Math.min(c.totalCounters, c.activeCounters + 2),
              processingRatePerHour: 28,
            };
          }
          if (c.id === "centre-b") {
            return {
              ...c,
              queueLength: c.queueLength + 6,
              predictedWaitMin: 52,
              capacityUsedPct: 71,
              farmersToday: c.farmersToday + shift,
            };
          }
          return c;
        }),
        forecast: s.forecast.map((p, i) =>
          i >= 4 ? { ...p, predicted: Math.round(p.predicted * 0.62) } : p,
        ),
        alerts: [
          {
            id: "alert-resolved",
            severity: "info" as const,
            title: `Intervention applied — ${shift} appointments moved to Centre B`,
            detail: "Centre A now projected to stay under 80% capacity for the rest of the day.",
          },
          ...s.alerts.filter((a) => a.severity !== "critical"),
        ],
        ticket: { ...s.ticket, farmersAhead: 3, etaMinutes: 14 },
      };
    });
    pushActivity({ kind: "admin", message: "APPROVED · 18 appointments re-routed Centre A → Centre B" });
    pushActivity({ kind: "centre", message: "Centre A counters 5 & 6 reactivated · rate 21 → 28/hr" });
  }, [pushActivity]);

  const resetSimulation = useCallback(() => {
    setState((s) => ({ ...initialState, language: s.language }));
  }, []);

  const value = useMemo<KisanContextValue>(() => {
    const summary: DistrictSummary = {
      totalCentres: state.centres.length,
      farmersToday: state.centres.reduce((n, c) => n + c.farmersToday, 0),
      quantityProcuredQuintals: state.centres.reduce((n, c) => n + c.procuredTodayQuintals, 0),
      averageWaitMin: Math.round(
        state.centres.reduce((n, c) => n + c.predictedWaitMin, 0) / state.centres.length,
      ),
      predictedOverloads: state.centres.filter((c) => c.capacityUsedPct >= 85).length,
    };

    return {
      ...state,
      setLanguage,
      toggleLanguage,
      triggerOverload,
      reviewRecommendation,
      approveRecommendation,
      overrideRecommendation,
      resetSimulation,
      summary,
      centreById: (id: string) => state.centres.find((c) => c.id === id),
      recommendedCentre: state.centres.find((c) => c.recommended),
    };
  }, [
    state,
    setLanguage,
    toggleLanguage,
    triggerOverload,
    reviewRecommendation,
    approveRecommendation,
    overrideRecommendation,
    resetSimulation,
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
