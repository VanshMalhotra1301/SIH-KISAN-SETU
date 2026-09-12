/**
 * KISAN SETU — Production State Management
 * All state loaded from Supabase on mount. No demo/mock data.
 *
 * Critical fix: Role-conditional data loading — each role only fetches what it needs.
 * Targeted realtime refresh — update only the changed entity, not full reload.
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
  DEFAULT_FORECAST_POINTS,
  DEFAULT_THROUGHPUT,
  DEFAULT_WAIT_ANALYTICS,
  forecastService,
  intelligenceService,
  interventionService,
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
  AnomalyDetection,
  CentreAlert,
  CongestionPrediction,
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
  anomalies: AnomalyDetection[];
  congestionPredictions: CongestionPrediction[];
  interventionApplied: boolean;
  isLoading: boolean;
  error: string | null;
}

interface KisanActions {
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  reviewRecommendation: () => void;
  approveRecommendation: () => void;
  overrideRecommendation: () => void;
  refreshFromDatabase: () => Promise<void>;
  refreshCentres: () => Promise<void>;
  refreshQueue: (centreId?: string) => Promise<void>;
  updateFarmerProfile: (updates: Partial<Farmer>) => Promise<void>;
  operatorProcessTicket: (params: OperatorProcessParams) => Promise<any>;
  operatorUpdateCounters: (centreId: string, activeCounters: number) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (notifId: string) => Promise<void>;
  sendNotification: (title: string, body: string, targetUserId?: string) => Promise<void>;
  refreshIntelligence: () => Promise<void>;
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
  forecast: DEFAULT_FORECAST_POINTS,
  waitAnalytics: DEFAULT_WAIT_ANALYTICS,
  throughput: DEFAULT_THROUGHPUT,
  activity: [],
  notifications: [],
  anomalies: [],
  congestionPredictions: [],
  interventionApplied: false,
  isLoading: true,
  error: null,
};

const KisanContext = createContext<KisanContextValue | null>(null);

export function KisanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<KisanState>(emptyState);

  /**
   * ROLE-CONDITIONAL DATA LOADING
   * Each role only fetches the data it actually needs.
   */
  const refreshFromDatabase = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const activeUserId = user?.id;
      const role = user?.role;
      const centreId = user?.centreId;
      const district = user?.district;

      // ── Common: notifications for all authenticated users ──
      const notificationsP = activeUserId
        ? notificationService.getForUser(activeUserId)
        : Promise.resolve([]);

      if (role === "farmer") {
        // FARMER: profile, centres (for booking), slot, ticket, timeline, payment, notifications
        const results = await Promise.allSettled([
          farmerService.getProfile(activeUserId),           // 0
          centreService.list(),                              // 1
          slotService.suggest(undefined, activeUserId),      // 2
          queueService.getTicket(activeUserId),              // 3
          procurementService.getTimeline(undefined, activeUserId), // 4
          paymentService.getStatus(activeUserId),            // 5
          notificationsP,                                    // 6
        ]);

        const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
          r.status === "fulfilled" ? r.value : fallback;

        setState((s) => ({
          ...s,
          farmer: val(results[0], s.farmer),
          centres: val(results[1], s.centres),
          slot: val(results[2], s.slot),
          ticket: val(results[3], s.ticket),
          timeline: val(results[4], s.timeline),
          payment: val(results[5], s.payment),
          notifications: val(results[6], s.notifications),
          isLoading: false,
          error: null,
        }));
      } else if (role === "centre_operator") {
        // OPERATOR: assigned centre, centre queue, alerts, notifications
        const effectiveCentreId = centreId || "";
        const results = await Promise.allSettled([
          centreId ? centreService.getById(centreId) : centreService.list(), // 0
          effectiveCentreId ? queueService.getCentreQueue(effectiveCentreId) : Promise.resolve([]), // 1
          analyticsService.alerts(effectiveCentreId || undefined),           // 2
          notificationsP,                                                    // 3
          effectiveCentreId ? forecastService.queueForecast(effectiveCentreId) : Promise.resolve([]), // 4
        ]);

        const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
          r.status === "fulfilled" ? r.value : fallback;

        const centreResult = results[0];
        let centres: ProcurementCentre[] = [];
        if (centreResult.status === "fulfilled") {
          centres = Array.isArray(centreResult.value) ? centreResult.value : [centreResult.value as ProcurementCentre];
        }

        setState((s) => ({
          ...s,
          centres,
          queueRows: val(results[1], s.queueRows),
          alerts: val(results[2], s.alerts),
          notifications: val(results[3], s.notifications),
          forecast: val(results[4], s.forecast),
          isLoading: false,
          error: null,
        }));
      } else if (role === "district_admin") {
        // DISTRICT ADMIN: district centres, all queue data, forecasts, analytics, recommendations, alerts, activity
        const results = await Promise.allSettled([
          district ? centreService.listByDistrict(district) : centreService.list(), // 0
          forecastService.queueForecast(),                    // 1
          forecastService.waitAnalytics(),                    // 2
          forecastService.throughput(),                       // 3
          recommendationService.current(),                    // 4
          analyticsService.alerts(),                          // 5
          analyticsService.activityFeed(),                    // 6
          notificationsP,                                     // 7
          intelligenceService.detectAnomalies(),              // 8
          intelligenceService.predictCongestion(),            // 9
          queueService.getAllQueue(),                         // 10
        ]);

        const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
          r.status === "fulfilled" ? r.value : fallback;

        const rec = val(results[4], null as AiRecommendation | null);

        setState((s) => ({
          ...s,
          centres: val(results[0], s.centres),
          forecast: val(results[1], s.forecast),
          waitAnalytics: val(results[2], s.waitAnalytics),
          throughput: val(results[3], s.throughput),
          recommendation: rec,
          alerts: val(results[5], s.alerts),
          activity: val(results[6], s.activity),
          notifications: val(results[7], s.notifications),
          anomalies: val(results[8], s.anomalies),
          congestionPredictions: val(results[9], s.congestionPredictions),
          queueRows: val(results[10], s.queueRows),
          interventionApplied: rec?.status === "approved",
          isLoading: false,
          error: null,
        }));
      } else if (role === "super_admin") {
        // SUPER ADMIN: everything
        const results = await Promise.allSettled([
          centreService.list(),                               // 0
          forecastService.queueForecast(),                    // 1
          forecastService.waitAnalytics(),                    // 2
          forecastService.throughput(),                       // 3
          recommendationService.current(),                    // 4
          analyticsService.alerts(),                          // 5
          analyticsService.activityFeed(),                    // 6
          notificationsP,                                     // 7
          intelligenceService.detectAnomalies(),              // 8
          intelligenceService.predictCongestion(),            // 9
          queueService.getAllQueue(),                         // 10
        ]);

        const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
          r.status === "fulfilled" ? r.value : fallback;

        const rec = val(results[4], null as AiRecommendation | null);

        setState((s) => ({
          ...s,
          centres: val(results[0], s.centres),
          forecast: val(results[1], s.forecast),
          waitAnalytics: val(results[2], s.waitAnalytics),
          throughput: val(results[3], s.throughput),
          recommendation: rec,
          alerts: val(results[5], s.alerts),
          activity: val(results[6], s.activity),
          notifications: val(results[7], s.notifications),
          anomalies: val(results[8], s.anomalies),
          congestionPredictions: val(results[9], s.congestionPredictions),
          queueRows: val(results[10], s.queueRows),
          interventionApplied: rec?.status === "approved",
          isLoading: false,
          error: null,
        }));
      } else {
        // Not authenticated or unknown role — load minimal public data
        const results = await Promise.allSettled([centreService.list()]);
        const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
          r.status === "fulfilled" ? r.value : fallback;

        setState((s) => ({
          ...s,
          centres: val(results[0], s.centres),
          isLoading: false,
          error: null,
        }));
      }
    } catch (err: any) {
      setState((s) => ({ ...s, isLoading: false, error: err?.message || "Failed to load data" }));
    }
  }, [user?.id, user?.role, user?.centreId, user?.district]);

  /** Targeted refresh: just centres */
  const refreshCentres = useCallback(async () => {
    try {
      const district = user?.district;
      const role = user?.role;
      let centres: ProcurementCentre[];
      if (role === "district_admin" && district) {
        centres = await centreService.listByDistrict(district);
      } else {
        centres = await centreService.list();
      }
      setState((s) => ({ ...s, centres }));
    } catch (err) {
      console.warn("Failed to refresh centres:", err);
    }
  }, [user?.district, user?.role]);

  /** Targeted refresh: queue for a specific centre */
  const refreshQueue = useCallback(async (centreId?: string) => {
    try {
      const cid = centreId || user?.centreId;
      if (!cid) return;
      const queueRows = await queueService.getCentreQueue(cid);
      setState((s) => ({ ...s, queueRows }));
    } catch (err) {
      console.warn("Failed to refresh queue:", err);
    }
  }, [user?.centreId]);

  /** Refresh intelligence data (anomalies + predictions) */
  const refreshIntelligence = useCallback(async () => {
    try {
      const [anomalies, congestionPredictions] = await Promise.all([
        intelligenceService.detectAnomalies(),
        intelligenceService.predictCongestion(),
      ]);
      setState((s) => ({ ...s, anomalies, congestionPredictions }));
    } catch (err) {
      console.warn("Failed to refresh intelligence:", err);
    }
  }, []);

  // Initial load + realtime subscriptions
  useEffect(() => {
    refreshFromDatabase();

    if (!user) return;

    const role = user.role;
    let ticketFilter: string | undefined;
    let paymentFilter: string | undefined;
    let centreFilter: string | undefined;

    if (role === "farmer" && user.id) {
      ticketFilter = `farmer_id=eq.${user.id}`;
      paymentFilter = `farmer_id=eq.${user.id}`;
    } else if (role === "centre_operator" && user.centreId) {
      ticketFilter = `centre_id=eq.${user.centreId}`;
      centreFilter = `id=eq.${user.centreId}`;
    }

    // NOTE: The Supabase JS SDK typing for postgres_changes has a known version mismatch.
    // The cast to `any` is intentional — all subscriptions function correctly at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelBuilder = supabase.channel(`kisan-sync-${user.id}`) as any;

    // ── Targeted Realtime Handlers ──

    // Centre updates: refresh just centres
    channelBuilder.on("postgres_changes", { event: "*", schema: "public", table: "procurement_centres", filter: centreFilter }, () => {
      refreshCentres();
    });

    // Queue ticket updates: refresh relevant data based on role
    channelBuilder.on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: ticketFilter }, () => {
      if (role === "farmer" && user.id) {
        // Farmer: refresh ticket + timeline
        queueService.getTicket(user.id).then((ticket) => setState((s) => ({ ...s, ticket }))).catch(() => {});
        procurementService.getTimeline(undefined, user.id).then((timeline) => setState((s) => ({ ...s, timeline }))).catch(() => {});
      } else if (role === "centre_operator" && user.centreId) {
        refreshQueue(user.centreId);
      } else {
        // Admin roles: full refresh is acceptable (less frequent)
        refreshFromDatabase();
      }
    });

    // Timeline updates (farmer-relevant)
    if (role === "farmer") {
      channelBuilder.on("postgres_changes", { event: "*", schema: "public", table: "procurement_timeline" }, () => {
        if (user.id) {
          procurementService.getTimeline(undefined, user.id).then((timeline) => setState((s) => ({ ...s, timeline }))).catch(() => {});
        }
      });
    }

    // Payment updates
    channelBuilder.on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: paymentFilter }, () => {
      if (role === "farmer" && user.id) {
        paymentService.getStatus(user.id).then((payment) => setState((s) => ({ ...s, payment }))).catch(() => {});
      }
    });

    // Slot updates
    if (role === "farmer") {
      channelBuilder.on("postgres_changes", { event: "*", schema: "public", table: "slots" }, () => {
        slotService.suggest(undefined, user.id).then((slot) => setState((s) => ({ ...s, slot }))).catch(() => {});
      });
    }

    // AI recommendations (admin roles only)
    if (role === "district_admin" || role === "super_admin") {
      channelBuilder.on("postgres_changes", { event: "*", schema: "public", table: "ai_recommendations" }, () => {
        recommendationService.current().then((recommendation) => {
          setState((s) => ({ ...s, recommendation, interventionApplied: recommendation?.status === "approved" }));
        }).catch(() => {});
      });
    }

    // Activity feed (admin roles only)
    if (role === "district_admin" || role === "super_admin") {
      channelBuilder.on("postgres_changes", { event: "*", schema: "public", table: "activity_feed" }, () => {
        analyticsService.activityFeed()
          .then((activity: any) => setState((s) => ({ ...s, activity })))
          .catch(() => {});
      });
    }

    // Notifications (all users, scoped)
    channelBuilder.on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`,
    }, () => {
      if (user?.id) {
        notificationService.getForUser(user.id)
          .then((notifications: any) => setState((s) => ({ ...s, notifications })))
          .catch(() => {});
      }
    });

    // Alerts
    if (role === "centre_operator" || role === "district_admin" || role === "super_admin") {
      channelBuilder.on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "centre_alerts",
        filter: centreFilter ? `centre_id=eq.${user.centreId}` : undefined,
      }, () => {
        analyticsService.alerts(user.centreId || undefined)
          .then((alerts: any) => setState((s) => ({ ...s, alerts })))
          .catch(() => {});
      });
    }

    channelBuilder.subscribe();

    return () => {
      supabase.removeChannel(channelBuilder);
    };
  }, [refreshFromDatabase, refreshCentres, refreshQueue, user]);

  // ─── Actions ───

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
    analyticsService.pushActivity({ kind: "queue", message: `Farmer registration updated: ${updates.crop || "Wheat"} · ${updates.quantityQuintals || 0} qtl` }).catch(() => {});
  }, [state.farmer?.id]);

  const operatorProcessTicket = useCallback(async (params: OperatorProcessParams) => {
    const result = await operatorService.processTicket(params);
    // Targeted refresh: just the queue
    if (user?.centreId) {
      await refreshQueue(user.centreId);
    }
    return result;
  }, [refreshQueue, user?.centreId]);

  const operatorUpdateCounters = useCallback(async (centreId: string, activeCounters: number) => {
    await operatorService.updateCounters(centreId, activeCounters);
    await refreshCentres();
  }, [refreshCentres]);

  const reviewRecommendation = useCallback(() => {
    if (!state.recommendation) return;
    setState((s) => s.recommendation ? ({ ...s, recommendation: { ...s.recommendation, status: "reviewing" } }) : s);
    recommendationService.review(state.recommendation.id).catch(() => {});
    auditService.log({
      action: "review_recommendation", targetType: "recommendation", targetId: state.recommendation.id,
    }).catch(() => {});
    analyticsService.pushActivity({ kind: "admin", message: "District officer opened AI recommendation for review" }).catch(() => {});
  }, [state.recommendation]);

  const overrideRecommendation = useCallback(() => {
    if (!state.recommendation) return;
    setState((s) => s.recommendation ? ({ ...s, recommendation: { ...s.recommendation, status: "overridden" } }) : s);
    recommendationService.override(state.recommendation.id).catch(() => {});
    auditService.log({
      action: "override_recommendation", targetType: "recommendation", targetId: state.recommendation.id,
    }).catch(() => {});
    analyticsService.pushActivity({ kind: "admin", message: "AI recommendation overridden — manual decision applied" }).catch(() => {});
  }, [state.recommendation]);

  const approveRecommendation = useCallback(async () => {
    if (!state.recommendation) return;
    const rec = state.recommendation;

    setState((s) => ({
      ...s,
      interventionApplied: true,
      recommendation: s.recommendation ? { ...s.recommendation, status: "approved" } : null,
    }));

    try {
      // Record the intervention with before-metrics
      const affectedCentreIds = [rec.action.fromCentreId, rec.action.toCentreId].filter(Boolean);
      const beforeMetrics = await interventionService.measureImpact(affectedCentreIds);

      await recommendationService.approve(rec.id);

      await interventionService.create({
        recommendationId: rec.id,
        type: "rebalance",
        description: rec.headline,
        appliedBy: user?.fullName || "District Admin",
        affectedCentreIds,
        metricsBefore: beforeMetrics || { avgWaitMin: 0, avgCapacityPct: 0, queueLength: 0 },
      });

      // Refresh centres and intelligence to reflect changes
      await refreshCentres();
      await refreshIntelligence();
    } catch (err) {
      console.error("Failed to approve recommendation:", err);
    }

    analyticsService.pushActivity({ kind: "admin", message: `APPROVED · ${rec.action.shiftAppointments} appointments re-routed` }).catch(() => {});
  }, [state.recommendation, user?.fullName, refreshCentres, refreshIntelligence]);

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
    const activeCentres = centres.filter((c) => c.farmersToday > 0 || c.queueLength > 0);

    const summary: DistrictSummary = {
      totalCentres: centres.length,
      activeCentres: activeCentres.length,
      farmersToday: centres.reduce((n, c) => n + c.farmersToday, 0),
      quantityProcuredQuintals: centres.reduce((n, c) => n + c.procuredTodayQuintals, 0),
      averageWaitMin: centres.length ? Math.round(centres.reduce((n, c) => n + c.predictedWaitMin, 0) / centres.length) : 0,
      predictedOverloads: centres.filter((c) => c.capacityUsedPct >= 85).length,
      paymentsPending: 0, // Will be populated from payments query when needed
      openGrievances: 0,  // Will be populated from grievances query when needed
    };

    return {
      ...state,
      setLanguage,
      toggleLanguage,
      reviewRecommendation,
      approveRecommendation,
      overrideRecommendation,
      refreshFromDatabase,
      refreshCentres,
      refreshQueue,
      refreshIntelligence,
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
    state, setLanguage, toggleLanguage,
    reviewRecommendation, approveRecommendation, overrideRecommendation,
    refreshFromDatabase, refreshCentres, refreshQueue, refreshIntelligence,
    updateFarmerProfile, operatorProcessTicket, operatorUpdateCounters,
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
