/**
 * Service abstraction layer.
 *
 * Every function here is the seam between the UI and the backend. Today they
 * resolve local demo data after a small simulated latency. To go live, replace
 * the body of each function with a `fetch`/WebSocket call — signatures and
 * return types stay identical, so no component needs to change.
 *
 * Example future implementation:
 *   export const centreService = {
 *     list: () => api.get<ProcurementCentre[]>("/v1/centres"),
 *   };
 */

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
  Farmer,
  ForecastPoint,
  PaymentStatus,
  ProcurementCentre,
  QueueRow,
  QueueTicket,
  SlotSuggestion,
  ThroughputPoint,
  TimelineStep,
  WaitAnalyticsPoint,
} from "./types";

const LATENCY_MS = 420;

function resolve<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((res) => setTimeout(() => res(structuredClone(value)), ms));
}

export const farmerService = {
  /** GET /v1/farmers/me */
  getProfile: (): Promise<Farmer> => resolve(demoFarmer),
  /** POST /v1/farmers/registration */
  register: (payload: Partial<Farmer>): Promise<Farmer> =>
    resolve({ ...demoFarmer, ...payload } as Farmer),
};

export const centreService = {
  /** GET /v1/centres?district=karnal */
  list: (): Promise<ProcurementCentre[]> => resolve(demoCentres),
  /** GET /v1/centres/nearby?crop=wheat&quantity=120 — ranked by the matching model */
  findSmartCentres: (): Promise<ProcurementCentre[]> => resolve(demoCentres.slice(0, 3)),
};

export const slotService = {
  /** GET /v1/slots/suggestion */
  suggest: (): Promise<SlotSuggestion> => resolve(demoSlot),
  /** POST /v1/slots/confirm */
  confirm: (slotId: string): Promise<{ slotId: string; confirmed: true }> =>
    resolve({ slotId, confirmed: true as const }),
};

export const queueService = {
  /** GET /v1/queue/ticket — WebSocket topic: queue.ticket.{token} */
  getTicket: (): Promise<QueueTicket> => resolve(demoTicket),
  /** GET /v1/centres/{id}/queue — WebSocket topic: queue.centre.{id} */
  getCentreQueue: (): Promise<QueueRow[]> => resolve(demoQueueRows),
};

export const procurementService = {
  /** GET /v1/procurement/timeline */
  getTimeline: (): Promise<TimelineStep[]> => resolve(demoTimeline),
};

export const paymentService = {
  /** GET /v1/payments/status */
  getStatus: (): Promise<PaymentStatus> => resolve(demoPayment),
};

export const forecastService = {
  /** GET /v1/forecast/queue?centre=centre-a */
  queueForecast: (): Promise<ForecastPoint[]> => resolve(demoForecast),
  /** GET /v1/analytics/wait-times */
  waitAnalytics: (): Promise<WaitAnalyticsPoint[]> => resolve(demoWaitAnalytics),
  /** GET /v1/analytics/throughput */
  throughput: (): Promise<ThroughputPoint[]> => resolve(demoThroughput),
};

export const recommendationService = {
  /** GET /v1/ai/recommendations */
  current: (): Promise<AiRecommendation> => resolve(demoRecommendation),
  /** POST /v1/ai/recommendations/{id}/approve */
  approve: (id: string): Promise<{ id: string; status: "approved" }> =>
    resolve({ id, status: "approved" as const }),
};

export const analyticsService = {
  /** GET /v1/centres/alerts */
  alerts: (): Promise<CentreAlert[]> => resolve(demoAlerts),
  /** WebSocket topic: district.activity */
  activityFeed: (): Promise<ActivityEvent[]> => resolve(demoActivity),
};
