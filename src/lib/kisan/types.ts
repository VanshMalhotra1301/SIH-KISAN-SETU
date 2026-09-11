/**
 * KISAN SETU domain model.
 * These interfaces are the contract between the UI and the service layer in
 * `services.ts`. Swapping demo data for REST/WebSocket calls later only
 * requires changing the service implementations, not the components.
 */

export type Language = "hi" | "en";

/** Matches the canonical roles in `profiles.role` and Supabase auth */
export type Role = "farmer" | "centre_operator" | "district_admin" | "super_admin";

export type CentreHealth = "green" | "yellow" | "red";

export interface Farmer {
  id: string;
  name: string;
  nameHi: string;
  village: string;
  villageHi: string;
  district: string;
  phone: string;
  farmerId: string;
  crop: string;
  cropHi: string;
  quantityQuintals: number;
  landAreaAcres?: number;
  bankName?: string;
  bankAccountMasked?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  aadhaarNumberMasked?: string;
}

export interface ProcurementCentre {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  district: string;
  distanceKm: number;
  queueLength: number;
  predictedWaitMin: number;
  capacityUsedPct: number;
  dailyCapacityQuintals: number;
  procuredTodayQuintals: number;
  activeCounters: number;
  totalCounters: number;
  processingRatePerHour: number;
  farmersToday: number;
  /** Map position in a 0-100 coordinate space (district schematic). */
  map: { x: number; y: number };
  recommended?: boolean;
  recommendationReasons?: string[];
  recommendationReasonsHi?: string[];
  status?: "active" | "inactive";
}

export interface SlotSuggestion {
  id: string;
  centreId: string;
  window: string;
  date: string;
  confidencePct: number;
  reason: string;
  reasonHi: string;
}

export interface QueueTicket {
  id: string;
  token: string;
  centreId: string;
  slotWindow: string;
  farmersAhead: number;
  etaMinutes: number;
  stage?: string;
  counterAssigned?: number;
}

export type TimelineState = "done" | "active" | "upcoming";

export interface TimelineStep {
  id: string;
  label: string;
  labelHi: string;
  detail: string;
  detailHi: string;
  state: TimelineState;
  timestamp?: string;
}

export interface PaymentStatus {
  id: string;
  grossAmount: number;
  currency: "INR";
  ratePerQuintal: number;
  quintals: number;
  stage: "pending_verification" | "approved" | "in_transfer" | "credited";
  expectedCreditIn: string;
  expectedCreditInHi: string;
  bankMasked: string;
  progressPct: number;
}

export interface QueueRow {
  id?: string | undefined;
  token: string;
  centreId: string;
  farmerId?: string | undefined;
  farmerName: string;
  village: string;
  crop: string;
  quantityQuintals: number;
  slotWindow: string;
  waitedMin: number;
  counterAssigned?: number | undefined;
  actualQuintals?: number | undefined;
  grossWeightQuintals?: number | undefined;
  tareWeightQuintals?: number | undefined;
  qualityGrade?: string | undefined;
  moisturePct?: number | undefined;
  foreignMatterPct?: number | undefined;
  jFormNo?: string | undefined;
  rejectionReason?: string | undefined;
  operatorNotes?: string | undefined;
  completedAt?: string | undefined;
  status: "waiting" | "arrived" | "weighing" | "grading" | "accepted" | "rejected" | "payment" | "done";
}

export interface CentreAlert {
  id: string;
  centreId?: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  atMinutes?: number;
}

export interface AiRecommendation {
  id: string;
  headline: string;
  rationale: string;
  impact: string;
  confidencePct: number;
  action: { shiftAppointments: number; fromCentreId: string; toCentreId: string };
  status: "pending" | "approved" | "overridden" | "reviewing";
  createdAt?: string;
}

export interface ForecastPoint {
  label: string;
  queue: number;
  predicted: number;
  capacityLine: number;
}

export interface WaitAnalyticsPoint {
  label: string;
  beforeMin: number;
  afterMin: number;
}

export interface ThroughputPoint {
  label: string;
  quintals: number;
}

export interface ActivityEvent {
  id: string;
  at: string;
  kind: "queue" | "ai" | "payment" | "centre" | "admin";
  message: string;
}

export interface DistrictSummary {
  totalCentres: number;
  activeCentres: number;
  farmersToday: number;
  quantityProcuredQuintals: number;
  averageWaitMin: number;
  predictedOverloads: number;
  paymentsPending: number;
  openGrievances: number;
}

export interface Grievance {
  id: string;
  ticketId?: string;
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  centreId?: string;
  centreName?: string;
  district: string;
  category: "weighing" | "delay" | "payment" | "quality_rejection" | "staff_conduct" | "portal_bug" | "other";
  subject: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "new" | "pending" | "escalated" | "resolved" | "reopened";
  assignedToName?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DistrictPerformance {
  district: string;
  totalCentres: number;
  activeCentres: number;
  farmersServed: number;
  procuredQuintals: number;
  averageWaitMin: number;
  utilizationPct: number;
  openGrievances: number;
  resolvedGrievances: number;
  status: "optimal" | "strained" | "critical";
}

// ─── Intervention & Intelligence Types ───

export interface InterventionRecord {
  id: string;
  recommendationId?: string;
  type: "rebalance" | "add_counter" | "extend_hours" | "redirect_traffic" | "manual";
  description: string;
  appliedBy: string;
  appliedAt: string;
  affectedCentreIds: string[];
  /** Snapshot of metrics before intervention */
  metricsBefore: {
    avgWaitMin: number;
    avgCapacityPct: number;
    queueLength: number;
  };
  /** Snapshot of metrics after intervention (measured later) */
  metricsAfter?: {
    avgWaitMin: number;
    avgCapacityPct: number;
    queueLength: number;
    measuredAt: string;
  };
  status: "applied" | "measuring" | "measured" | "failed";
}

export interface AnomalyDetection {
  id: string;
  centreId: string;
  centreName: string;
  type: "queue_spike" | "processing_slow" | "payment_delay" | "capacity_breach" | "idle_counter";
  severity: "critical" | "warning" | "info";
  description: string;
  detectedAt: string;
  currentValue: number;
  expectedValue: number;
  deviationPct: number;
  isResolved: boolean;
}

export interface CongestionPrediction {
  centreId: string;
  centreName: string;
  currentCapacityPct: number;
  predictedCapacityPct: number;
  predictedBreachTime?: string | undefined;
  confidence: number;
  factors: string[];
  recommendation?: string | undefined;
}

export interface WhatIfScenario {
  id: string;
  description: string;
  changes: Array<{
    centreId: string;
    parameter: "active_counters" | "processing_rate" | "redirect_farmers";
    currentValue: number;
    proposedValue: number;
  }>;
  predictedOutcome: {
    avgWaitChange: number;
    capacityChange: number;
    throughputChange: number;
  };
}

export interface SystemHealth {
  supabaseConnected: boolean;
  realtimeActive: boolean;
  activeSessions: number;
  lastSyncAt: string;
  errorRate: number;
  avgResponseMs: number;
}

export interface MspRate {
  id: string;
  crop: string;
  cropHi: string;
  ratePerQuintal: number;
  season: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface ProcurementTarget {
  id: string;
  district: string;
  centreId?: string;
  crop: string;
  targetQuintals: number;
  actualQuintals: number;
  season: string;
  progressPct: number;
}
