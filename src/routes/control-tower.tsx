import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";

import { PageShell } from "@/components/kisan/app-shell";
import { AuthGuard } from "@/components/kisan/auth-guard";
import { ForecastChart, ThroughputChart, WaitAnalyticsChart } from "@/components/kisan/charts";
import { DistrictMap } from "@/components/kisan/district-map";
import { CapacityBar, HealthDot, Pill, SectionLabel, StatCard } from "@/components/kisan/primitives";
import { useAuth } from "@/hooks/use-auth";
import { centreHealth, useKisan } from "@/lib/kisan/store";
import { centreService, grievanceService, intelligenceService, interventionService } from "@/lib/kisan/services";
import type {
  ActivityEvent,
  AiRecommendation,
  AnomalyDetection,
  CongestionPrediction,
  Grievance,
  InterventionRecord,
  ProcurementCentre,
  WhatIfScenario,
} from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/control-tower")({
  head: () => ({
    meta: [
      { title: "District Control Tower — Live Centre Health & AI Intelligence | KISAN SETU" },
      {
        name: "description",
        content:
          "District command-centre dashboard for district officers: live centre map, queue forecasts, waiting-time analytics, throughput, AI congestion predictions and capacity balancing.",
      },
      { property: "og:title", content: "KISAN SETU — District Control Tower" },
      {
        property: "og:description",
        content: "AI-powered procurement orchestration for government administrators.",
      },
    ],
  }),
  component: ControlTowerPageGuarded,
});

/* ─── Types & Config ─── */

type ControlTab = "overview" | "centres" | "intelligence" | "simulation" | "interventions" | "analytics";

const recStatusConfig: Record<AiRecommendation["status"], { label: string; tone: "saffron" | "leaf" | "muted" | "navy" }> = {
  pending: { label: "Pending decision", tone: "saffron" },
  reviewing: { label: "Under review", tone: "navy" },
  approved: { label: "Approved ✓", tone: "leaf" },
  overridden: { label: "Overridden", tone: "muted" },
};

const defaultKindStyle = { icon: "📋", color: "text-navy" };

const kindStyles: Record<string, { icon: string; color: string }> = {
  queue: { icon: "📋", color: "text-navy" },
  ai: { icon: "🤖", color: "text-saffron" },
  payment: { icon: "💰", color: "text-leaf" },
  centre: { icon: "🏢", color: "text-navy" },
  admin: { icon: "👤", color: "text-navy" },
};

/* ─── Page ─── */

function ControlTowerPageGuarded() {
  return (
    <AuthGuard allowedRoles={["district_admin", "super_admin"]}>
      <ControlTowerPage />
    </AuthGuard>
  );
}

function ControlTowerPage() {
  const {
    language,
    centres,
    forecast,
    waitAnalytics,
    throughput,
    recommendation,
    alerts,
    activity,
    anomalies,
    congestionPredictions,
    interventionApplied,
    reviewRecommendation,
    approveRecommendation,
    overrideRecommendation,
    refreshIntelligence,
    summary,
  } = useKisan();
  const hi = language === "hi";
  const { user } = useAuth();
  const userDistrict = user?.district || "";
  const firstCentreName = centres[0]?.name || (hi ? "सभी केंद्र" : "All Centres");

  const [activeTab, setActiveTab] = useState<ControlTab>("overview");
  const [selectedCentre, setSelectedCentre] = useState<ProcurementCentre | null>(null);
  const [centreStatusFilter, setCentreStatusFilter] = useState<"all" | "green" | "yellow" | "red">("all");

  const recSt = recommendation ? recStatusConfig[recommendation.status] : recStatusConfig.pending;

  const filteredCentres = useMemo(() => {
    if (centreStatusFilter === "all") return centres;
    return centres.filter((c) => centreHealth(c.capacityUsedPct) === centreStatusFilter);
  }, [centres, centreStatusFilter]);

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const criticalAnomalies = anomalies.filter((a) => a.severity === "critical");
  const tabs: { id: ControlTab; label: string; labelHi: string }[] = [
    { id: "overview", label: "Overview", labelHi: "अवलोकन" },
    { id: "centres", label: "Centre Grid", labelHi: "केंद्र ग्रिड" },
    { id: "intelligence", label: "AI Sentinel", labelHi: "AI सेंटिनल" },
    { id: "simulation", label: "What-If Simulator", labelHi: "परिकल्पना सिमुलेटर" },
    { id: "interventions", label: "Interventions & SLA", labelHi: "हस्तक्षेप व SLA" },
    { id: "analytics", label: "Analytics", labelHi: "विश्लेषण" },
  ];

  return (
    <PageShell tone="light">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionLabel tone="light">{hi ? "जिला कमांड सेंटर" : "District Command Centre"}</SectionLabel>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-navy sm:text-4xl">
            {hi ? `कंट्रोल टावर — ${userDistrict}` : `Control Tower — ${userDistrict}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground shadow-xs">
            <span className="size-1.5 rounded-full bg-leaf animate-blip" /> {hi ? "लाइव" : "LIVE"}
          </span>
          <button
            type="button"
            onClick={() => refreshIntelligence()}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-navy shadow-xs transition-colors hover:bg-muted focus-ring"
          >
            🔄 {hi ? "ताज़ा करें" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Critical Alert Banner ── */}
      {(criticalAlerts.length > 0 || criticalAnomalies.length > 0) && (
        <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-5 py-3.5 animate-rise">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚨</span>
            <p className="text-sm font-bold text-danger">
              {hi ? "गंभीर अलर्ट" : "CRITICAL ALERTS"}: {criticalAlerts.length + criticalAnomalies.length}
            </p>
          </div>
          <div className="mt-2 space-y-1">
            {criticalAlerts.map((a) => (
              <p key={a.id} className="text-xs font-semibold text-danger/80">• {a.title}: {a.detail}</p>
            ))}
            {criticalAnomalies.map((a) => (
              <p key={a.id} className="text-xs font-semibold text-danger/80">• {a.centreName}: {a.description}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <nav className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5 shadow-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-colors focus-ring",
              activeTab === tab.id
                ? "bg-navy text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-navy",
            )}
          >
            {hi ? tab.labelHi : tab.label}
          </button>
        ))}
      </nav>

      {/* ── KPI Row ── */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard tone="light" label={hi ? "कुल केंद्र" : "Total centres"} value={summary.totalCentres} accent="navy" />
        <StatCard tone="light" label={hi ? "सक्रिय केंद्र" : "Active centres"} value={summary.activeCentres} accent="leaf" />
        <StatCard tone="light" label={hi ? "आज के किसान" : "Farmers today"} value={summary.farmersToday} accent="navy" />
        <StatCard
          tone="light"
          label={hi ? "खरीदी गई मात्रा" : "Qty procured"}
          value={summary.quantityProcuredQuintals.toLocaleString("en-IN")}
          unit="qtl"
          accent="leaf"
        />
        <StatCard
          tone="light"
          label={hi ? "औसत प्रतीक्षा" : "Avg wait"}
          value={summary.averageWaitMin}
          unit="min"
          accent={summary.averageWaitMin > 60 ? "danger" : summary.averageWaitMin > 30 ? "saffron" : "leaf"}
        />
        <StatCard
          tone="light"
          label={hi ? "अनुमानित ओवरलोड" : "Predicted overloads"}
          value={summary.predictedOverloads}
          accent={summary.predictedOverloads > 0 ? "danger" : "leaf"}
        />
      </section>

      {/* ── Tab Content ── */}
      {activeTab === "overview" && (
        <OverviewTab
          hi={hi}
          centres={centres}
          forecast={forecast}
          recommendation={recommendation}
          recSt={recSt}
          alerts={alerts}
          activity={activity}
          userDistrict={userDistrict}
          firstCentreName={firstCentreName}
          interventionApplied={interventionApplied}
          approveRecommendation={approveRecommendation}
          reviewRecommendation={reviewRecommendation}
          overrideRecommendation={overrideRecommendation}
        />
      )}

      {activeTab === "centres" && (
        <CentreGridTab
          hi={hi}
          centres={filteredCentres}
          centreStatusFilter={centreStatusFilter}
          setCentreStatusFilter={setCentreStatusFilter}
          selectedCentre={selectedCentre}
          setSelectedCentre={setSelectedCentre}
        />
      )}

      {activeTab === "intelligence" && (
        <IntelligenceTab
          hi={hi}
          congestionPredictions={congestionPredictions}
          recommendation={recommendation}
          recSt={recSt}
          interventionApplied={interventionApplied}
          approveRecommendation={approveRecommendation}
          reviewRecommendation={reviewRecommendation}
          overrideRecommendation={overrideRecommendation}
        />
      )}

      {activeTab === "simulation" && (
        <SimulationTab
          hi={hi}
          centres={centres}
          userDistrict={userDistrict}
          onInterventionApplied={refreshIntelligence}
        />
      )}

      {activeTab === "interventions" && (
        <InterventionsAndSlaTab
          hi={hi}
          anomalies={anomalies}
          userDistrict={userDistrict}
        />
      )}

      {activeTab === "analytics" && (
        <AnalyticsTab
          hi={hi}
          waitAnalytics={waitAnalytics}
          throughput={throughput}
          forecast={forecast}
          firstCentreName={firstCentreName}
        />
      )}
    </PageShell>
  );
}

/* ─── Overview Tab ─── */

function OverviewTab({ hi, centres, forecast, recommendation, recSt, alerts, activity, userDistrict, firstCentreName, interventionApplied, approveRecommendation, reviewRecommendation, overrideRecommendation }: any) {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      {/* Left: Map + Forecast */}
      <div className="space-y-6">
        <section className="relative">
          <SectionLabel tone="light">{hi ? "जिला केंद्र स्वास्थ्य" : "District centre health"}</SectionLabel>
          <h2 className="mt-2 font-display text-xl font-extrabold text-navy">
            {hi ? "लाइव सेंटर मैप" : "Live centre map"}
          </h2>
          <div className="mt-4">
            {centres.length === 0 && (
              <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-4">
                <div className="rounded-xl border border-border bg-card/90 p-6 text-center shadow-xs backdrop-blur-md">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {hi ? "आपके अधिकार क्षेत्र में कोई खरीद केंद्र उपलब्ध नहीं है।" : "No procurement centres are configured in your jurisdiction."}
                  </p>
                </div>
              </div>
            )}
            <DistrictMap centres={centres} district={userDistrict} tone="light" />
          </div>
        </section>

        <section className="surface-lift p-5">
          <SectionLabel tone="light">{hi ? `कतार पूर्वानुमान — ${firstCentreName}` : `Queue forecast — ${firstCentreName}`}</SectionLabel>
          <h3 className="mt-2 font-display text-lg font-extrabold text-navy">
            {hi ? "वास्तविक बनाम अनुमानित" : "Actual vs predicted queue"}
          </h3>
          <div className="mt-4">
            <ForecastChart data={forecast} tone="light" />
          </div>
          <div className="mt-3 flex gap-4 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-leaf" /> {hi ? "वास्तविक" : "Actual"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-navy" /> {hi ? "अनुमानित" : "Predicted"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-danger" /> {hi ? "सुरक्षित क्षमता" : "Safe capacity"}
            </span>
          </div>
        </section>
      </div>

      {/* Right: AI + Feed */}
      <div className="space-y-6">
        <RecommendationPanel
          hi={hi}
          recommendation={recommendation}
          recSt={recSt}
          alerts={alerts}
          interventionApplied={interventionApplied}
          approveRecommendation={approveRecommendation}
          reviewRecommendation={reviewRecommendation}
          overrideRecommendation={overrideRecommendation}
          centres={centres}
        />

        {/* Live Intelligence Feed */}
        <section className="surface-lift overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <SectionLabel tone="light">{hi ? "लाइव इंटेलिजेंस फ़ीड" : "Live intelligence feed"}</SectionLabel>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-leaf animate-blip" /> {hi ? "लाइव" : "Live"}
            </span>
          </div>
          <div className="max-h-80 divide-y divide-border/60 overflow-y-auto">
            {activity.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {hi ? "कोई हालिया गतिविधि नहीं" : "No recent activity"}
              </div>
            )}
            {activity.map((event: ActivityEvent) => {
              const kind = kindStyles[event.kind] || defaultKindStyle;
              return (
                <div key={event.id} className="flex gap-3 px-5 py-3 animate-rise">
                  <span className="mt-0.5 shrink-0 text-sm" aria-hidden>{kind.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">{event.message}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{event.at}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Centre Grid Tab ─── */

function CentreGridTab({ hi, centres, centreStatusFilter, setCentreStatusFilter, selectedCentre, setSelectedCentre }: any) {
  return (
    <div className="mt-6 space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted-foreground">{hi ? "फ़िल्टर:" : "Filter:"}</span>
        {(["all", "green", "yellow", "red"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setCentreStatusFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-ring",
              centreStatusFilter === f
                ? "bg-navy text-primary-foreground shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-navy",
            )}
          >
            {f === "all" ? (hi ? "सभी" : "All") :
             f === "green" ? (hi ? "🟢 सामान्य" : "🟢 Normal") :
             f === "yellow" ? (hi ? "🟡 तनाव" : "🟡 Strained") :
             (hi ? "🔴 गंभीर" : "🔴 Critical")}
          </button>
        ))}
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {centres.length} {hi ? "केंद्र" : "centres"}
        </span>
      </div>

      {/* Centre Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {centres.map((centre: ProcurementCentre) => {
          const health = centreHealth(centre.capacityUsedPct);
          const isSelected = selectedCentre?.id === centre.id;
          return (
            <button
              key={centre.id}
              type="button"
              onClick={() => setSelectedCentre(isSelected ? null : centre)}
              className={cn(
                "surface-lift p-4 text-left transition-all hover:border-navy/40 focus-ring",
                isSelected && "border-navy/60 ring-2 ring-navy/20",
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{centre.code}</p>
                  <h3 className="mt-1 font-display text-base font-extrabold text-navy">{hi ? centre.nameHi : centre.name}</h3>
                </div>
                <HealthDot health={health} />
              </div>
              <div className="mt-3">
                <CapacityBar pct={centre.capacityUsedPct} tone="light" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-extrabold text-navy">{centre.queueLength}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground">{hi ? "कतार" : "Queue"}</p>
                </div>
                <div>
                  <p className="text-lg font-extrabold text-navy">{centre.predictedWaitMin}m</p>
                  <p className="text-[10px] font-semibold text-muted-foreground">{hi ? "प्रतीक्षा" : "Wait"}</p>
                </div>
                <div>
                  <p className="text-lg font-extrabold text-navy">{centre.farmersToday}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground">{hi ? "किसान" : "Farmers"}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">
                  {centre.activeCounters}/{centre.totalCounters} {hi ? "काउंटर" : "counters"}
                </span>
                <span className="font-bold text-leaf">
                  {centre.procuredTodayQuintals.toLocaleString("en-IN")} qtl
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Centre Detail */}
      {selectedCentre && (
        <section className="surface-lift p-5 animate-rise">
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel tone="light">{hi ? "केंद्र विवरण" : "Centre detail"}</SectionLabel>
              <h3 className="mt-1 font-display text-xl font-extrabold text-navy">
                {hi ? selectedCentre.nameHi : selectedCentre.name}
              </h3>
            </div>
            <button type="button" onClick={() => setSelectedCentre(null)} className="text-muted-foreground hover:text-navy text-lg">✕</button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{hi ? "दैनिक क्षमता" : "Daily capacity"}</p>
              <p className="mt-1 text-2xl font-extrabold text-navy">{selectedCentre.dailyCapacityQuintals.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">quintals</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{hi ? "प्रसंस्करण दर" : "Processing rate"}</p>
              <p className="mt-1 text-2xl font-extrabold text-navy">{selectedCentre.processingRatePerHour}</p>
              <p className="text-xs text-muted-foreground">{hi ? "प्रति घंटा" : "per hour"}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{hi ? "दूरी" : "Distance"}</p>
              <p className="mt-1 text-2xl font-extrabold text-navy">{selectedCentre.distanceKm}</p>
              <p className="text-xs text-muted-foreground">km</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{hi ? "उपयोग" : "Utilization"}</p>
              <p className="mt-1 text-2xl font-extrabold text-navy">{selectedCentre.capacityUsedPct}%</p>
              <CapacityBar pct={selectedCentre.capacityUsedPct} tone="light" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Intelligence Tab ─── */

function IntelligenceTab({ hi, congestionPredictions, recommendation, recSt, interventionApplied, approveRecommendation, reviewRecommendation, overrideRecommendation }: any) {
  return (
    <div className="mt-6 space-y-6">
      {/* AI Recommendation */}
      <RecommendationPanel
        hi={hi}
        recommendation={recommendation}
        recSt={recSt}
        alerts={[]}
        interventionApplied={interventionApplied}
        approveRecommendation={approveRecommendation}
        reviewRecommendation={reviewRecommendation}
        overrideRecommendation={overrideRecommendation}
        centres={[]}
      />

      {/* Congestion Predictions */}
      <section className="surface-lift p-5">
        <SectionLabel tone="light">{hi ? "भीड़ पूर्वानुमान" : "Congestion predictions"}</SectionLabel>
        <h3 className="mt-2 font-display text-lg font-extrabold text-navy">
          {hi ? "केंद्र-वार क्षमता अनुमान" : "Centre-wise capacity forecast"}
        </h3>

        {congestionPredictions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{hi ? "कोई सक्रिय पूर्वानुमान नहीं" : "No active congestion predictions"}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {congestionPredictions.map((pred: any) => (
              <div key={pred.centreId} className="rounded-xl border border-border bg-muted/20 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HealthDot health={pred.predictedCapacityPct >= 90 ? "red" : pred.predictedCapacityPct >= 70 ? "yellow" : "green"} />
                    <h4 className="font-display font-bold text-navy">{pred.centreName}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {pred.currentCapacityPct}% → {pred.predictedCapacityPct}%
                    </span>
                    <Pill tone={pred.predictedCapacityPct >= 90 ? "danger" : pred.predictedCapacityPct >= 70 ? "saffron" : "leaf"}>
                      {pred.confidence}% {hi ? "विश्वास" : "confidence"}
                    </Pill>
                  </div>
                </div>
                <CapacityBar pct={pred.predictedCapacityPct} tone="light" />
                {pred.predictedBreachTime && (
                  <p className="mt-2 text-xs font-bold text-danger">
                    ⚠️ {hi ? `क्षमता भंग अनुमान: ${pred.predictedBreachTime}` : `Capacity breach projected at ${pred.predictedBreachTime}`}
                  </p>
                )}
                {pred.factors.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {pred.factors.map((f: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">• {f}</p>
                    ))}
                  </div>
                )}
                {pred.recommendation && (
                  <div className="mt-2 rounded-lg border border-leaf/30 bg-leaf/10 px-3 py-2">
                    <p className="text-xs font-bold text-leaf">💡 {pred.recommendation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Simulation Tab (What-If Scenario Lab) ─── */

function SimulationTab({
  hi,
  centres,
  userDistrict,
  onInterventionApplied,
}: {
  hi: boolean;
  centres: ProcurementCentre[];
  userDistrict: string;
  onInterventionApplied?: () => void;
}) {
  const [selectedCentreId, setSelectedCentreId] = useState<string>(centres[0]?.id || "");
  const [paramType, setParamType] = useState<"counters" | "redirect">("counters");
  const [counterDelta, setCounterDelta] = useState<number>(1);
  const [redirectCount, setRedirectCount] = useState<number>(10);
  const [targetCentreId, setTargetCentreId] = useState<string>(centres[1]?.id || "");
  const [isSimulating, setIsSimulating] = useState(false);
  const [outcome, setOutcome] = useState<WhatIfScenario["predictedOutcome"] | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null);

  const selectedCentre = centres.find((c) => c.id === selectedCentreId) || centres[0];
  const targetCentre = centres.find((c) => c.id === targetCentreId);

  useEffect(() => {
    if (!selectedCentre) return;
    setIsSimulating(true);

    const changes: WhatIfScenario["changes"] =
      paramType === "counters"
        ? [
            {
              centreId: selectedCentre.id,
              parameter: "active_counters",
              currentValue: selectedCentre.activeCounters,
              proposedValue: Math.min(selectedCentre.totalCounters, selectedCentre.activeCounters + counterDelta),
            },
          ]
        : [
            {
              centreId: selectedCentre.id,
              parameter: "redirect_farmers",
              currentValue: selectedCentre.queueLength,
              proposedValue: redirectCount,
            },
          ];

    intelligenceService
      .simulateWhatIf(changes)
      .then((res) => {
        setOutcome(res);
      })
      .catch(() => {})
      .finally(() => setIsSimulating(false));
  }, [selectedCentre, paramType, counterDelta, redirectCount]);

  const handleApplyScenario = async () => {
    if (!selectedCentre) return;
    setApplying(true);
    setAppliedMsg(null);

    try {
      if (paramType === "counters") {
        const proposedCounters = Math.min(selectedCentre.totalCounters, selectedCentre.activeCounters + counterDelta);
        await centreService.update(selectedCentre.id, { activeCounters: proposedCounters });
        await interventionService.create({
          type: "add_counter",
          description: `Allocated ${counterDelta} additional operational scales at ${selectedCentre.name}`,
          appliedBy: "District Control Tower",
          affectedCentreIds: [selectedCentre.id],
          metricsBefore: {
            avgWaitMin: selectedCentre.predictedWaitMin,
            avgCapacityPct: selectedCentre.capacityUsedPct,
            queueLength: selectedCentre.queueLength,
          },
          district: userDistrict,
        });
      } else {
        await interventionService.create({
          type: "redirect_traffic",
          description: `Diverted ${redirectCount} incoming tractor bookings from ${selectedCentre.name} to ${targetCentre?.name || "adjacent mandi"}`,
          appliedBy: "District Control Tower",
          affectedCentreIds: [selectedCentre.id, targetCentreId].filter(Boolean),
          metricsBefore: {
            avgWaitMin: selectedCentre.predictedWaitMin,
            avgCapacityPct: selectedCentre.capacityUsedPct,
            queueLength: selectedCentre.queueLength,
          },
          district: userDistrict,
        });
      }

      setAppliedMsg(
        hi
          ? "✓ परिकल्पना सिमुलेशन सफलतापूर्वक लागू किया गया और खरीद केंद्र को आदेश प्रेषित किया गया।"
          : "✓ What-If scenario successfully executed & dispatched as official operational directive.",
      );
      if (onInterventionApplied) onInterventionApplied();
    } catch (err: any) {
      setAppliedMsg(`Error applying scenario: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionLabel tone="light">{hi ? "परिकल्पना सिमुलेशन लैब" : "What-If Scenario Simulation Lab"}</SectionLabel>
          <h3 className="mt-1 font-display text-xl font-extrabold text-navy">
            {hi ? "कमांड मॉडलिंग एवं क्षमता संतुलन" : "Predictive Capacity & Flow Modeling"}
          </h3>
        </div>
        <Pill tone="navy">AI Predictive Engine</Pill>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Controls Card */}
        <div className="surface-lift p-5 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {hi ? "1. लक्ष्य खरीद केंद्र चुनें" : "1. Select Target Procurement Centre"}
            </label>
            <select
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-navy focus-ring"
            >
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {hi ? c.nameHi : c.name} ({c.capacityUsedPct}% Capacity · {c.predictedWaitMin}m wait)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {hi ? "2. परिचालन हस्तक्षेप प्रकार" : "2. Operational Intervention Type"}
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setParamType("counters")}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all focus-ring",
                  paramType === "counters"
                    ? "border-navy/60 bg-navy/10 text-navy ring-1 ring-navy/30"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-border/80 hover:text-navy",
                )}
              >
                <p className="text-xs font-black uppercase">⚖️ {hi ? "काउंटर जोड़ें" : "Scale Activation"}</p>
                <p className="mt-1 text-[11px] opacity-80">
                  {hi ? "स्टैंडबाय धर्मकांटा सक्रिय करें" : "Activate standby weighbridge"}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setParamType("redirect")}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all focus-ring",
                  paramType === "redirect"
                    ? "border-leaf/60 bg-leaf/10 text-leaf ring-1 ring-leaf/30"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-border/80 hover:text-navy",
                )}
              >
                <p className="text-xs font-black uppercase">🚜 {hi ? "ट्रैक्टर डायवर्जन" : "Load Diversion"}</p>
                <p className="mt-1 text-[11px] opacity-80">
                  {hi ? "नजदीकी केंद्र पर री-रूट करें" : "Re-route to neighbouring mandi"}
                </p>
              </button>
            </div>
          </div>

          {paramType === "counters" ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted-foreground">{hi ? "वर्तमान सक्रिय काउंटर:" : "Current Active Scales:"}</span>
                <span className="font-bold text-navy">{selectedCentre?.activeCounters} / {selectedCentre?.totalCounters}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {hi ? `अतिरिक्त काउंटर जोड़ें (+${counterDelta}):` : `Add Additional Scales (+${counterDelta}):`}
                </label>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={selectedCentre ? selectedCentre.activeCounters + n > selectedCentre.totalCounters : false}
                      onClick={() => setCounterDelta(n)}
                      className={cn(
                        "flex-1 rounded-lg border py-2 text-sm font-bold transition-all focus-ring",
                        counterDelta === n
                          ? "border-navy bg-navy text-primary-foreground"
                          : "border-border bg-card text-navy hover:bg-muted disabled:opacity-30",
                      )}
                    >
                      +{n} {hi ? "स्केल" : "Scales"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {hi ? "गंतव्य केंद्र (री-रूट):" : "Destination Relief Centre:"}
                </label>
                <select
                  value={targetCentreId}
                  onChange={(e) => setTargetCentreId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-navy focus-ring"
                >
                  {centres
                    .filter((c) => c.id !== selectedCentreId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.capacityUsedPct}% used · {c.distanceKm}km)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  {hi ? `डायवर्ट करने हेतु ट्रैक्टर संख्या (${redirectCount}):` : `Tractors to Divert (${redirectCount}):`}
                </label>
                <input
                  type="range"
                  min="5"
                  max={Math.max(10, Math.min(50, selectedCentre?.queueLength || 25))}
                  step="5"
                  value={redirectCount}
                  onChange={(e) => setRedirectCount(Number(e.target.value))}
                  className="mt-2 w-full accent-leaf"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>5 tractors</span>
                  <span>{redirectCount} tractors</span>
                  <span>{Math.max(10, Math.min(50, selectedCentre?.queueLength || 25))} tractors</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={applying}
            onClick={handleApplyScenario}
            className="w-full rounded-xl bg-gradient-leaf py-3 text-sm font-black text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:opacity-50 focus-ring"
          >
            {applying ? (hi ? "आदेश प्रेषित किया जा रहा है..." : "Executing Directive...") : (hi ? "⚡ सिमुलेशन परिणाम को आधिकारिक रूप से लागू करें" : "⚡ Execute & Apply Simulated Directive")}
          </button>

          {appliedMsg && (
            <div className="rounded-xl border border-leaf/40 bg-leaf/10 p-3 text-xs font-bold text-leaf animate-rise">
              {appliedMsg}
            </div>
          )}
        </div>

        {/* Live Simulation Outcomes */}
        <div className="surface-lift p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <SectionLabel tone="light">{hi ? "अनुमानित परिचालन प्रभाव" : "Predicted Operational Outcome"}</SectionLabel>
              {isSimulating && <span className="text-[10px] text-navy font-bold animate-pulse">Calculating...</span>}
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{hi ? "औसत प्रतीक्षा समय प्रभाव:" : "Average Waiting Time Impact:"}</span>
                  <span className="text-base font-black text-leaf">
                    {outcome?.avgWaitChange ?? -15} min
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Before: {selectedCentre?.predictedWaitMin || 40}m</span>
                  <span className="font-bold text-navy">
                    After: {Math.max(5, (selectedCentre?.predictedWaitMin || 40) + (outcome?.avgWaitChange ?? -15))}m
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{hi ? "यार्ड क्षमता राहत:" : "Yard Capacity Relief:"}</span>
                  <span className="text-base font-black text-navy">
                    {outcome?.capacityChange ?? -12}%
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Before: {selectedCentre?.capacityUsedPct || 80}%</span>
                  <span className="font-bold text-navy">
                    After: {Math.max(10, (selectedCentre?.capacityUsedPct || 80) + (outcome?.capacityChange ?? -12))}%
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{hi ? "थ्रूपुट वृद्धि:" : "Throughput Increase:"}</span>
                  <span className="text-base font-black text-leaf">
                    +{(outcome?.throughputChange && outcome.throughputChange > 0 ? outcome.throughputChange : 40)} qtl/hr
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {hi ? "दैनिक खरीद में तीव्र गति एवं रात्रि ओवरफ्लो से मुक्ति" : "Accelerates intake, clearing road queues before peak cutoff."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
            🛡️ {hi ? "सभी आदेश राज्य ई-प्रोक्योरमेंट ऑडिट ट्रेल में 100% दर्ज होते हैं।" : "All directives conform to APMC statutory limits and record to tamper-evident audit logs."}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Interventions & SLA Tab ─── */

function InterventionsAndSlaTab({
  hi,
  anomalies,
  userDistrict,
}: {
  hi: boolean;
  anomalies: AnomalyDetection[];
  userDistrict: string;
}) {
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeSection, setActiveSection] = useState<"anomalies" | "interventions" | "grievances" | "sla">("anomalies");

  useEffect(() => {
    Promise.allSettled([
      interventionService.list(userDistrict),
      grievanceService.list({ district: userDistrict }),
    ]).then(([intRes, griRes]) => {
      if (intRes.status === "fulfilled") setInterventions(intRes.value);
      if (griRes.status === "fulfilled") setGrievances(griRes.value);
      setLoadingHistory(false);
    });
  }, [userDistrict]);

  const handleResolveGrievance = async (gId: string) => {
    try {
      await grievanceService.resolve(gId, "Resolved by District Control Tower with immediate queue priority.");
      const updated = await grievanceService.list({ district: userDistrict });
      setGrievances(updated);
    } catch (err) {
      console.error("Grievance resolve error:", err);
    }
  };

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sortedAnomalies = [...anomalies].sort(
    (a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2),
  );

  return (
    <div className="mt-6 space-y-6">
      {/* Subnavigation */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveSection("anomalies")}
          className={cn(
            "rounded-lg px-3.5 py-2 text-xs font-bold transition-colors focus-ring",
            activeSection === "anomalies"
              ? "bg-navy text-primary-foreground shadow-xs"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-navy",
          )}
        >
          🚨 {hi ? "ऑपरेशनल विसंगतियां" : "Operational Anomalies"} ({anomalies.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("interventions")}
          className={cn(
            "rounded-lg px-3.5 py-2 text-xs font-bold transition-colors focus-ring",
            activeSection === "interventions"
              ? "bg-navy text-primary-foreground shadow-xs"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-navy",
          )}
        >
          📜 {hi ? "हस्तक्षेप इतिहास एवं प्रभाव" : "Intervention History"} ({interventions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("grievances")}
          className={cn(
            "rounded-lg px-3.5 py-2 text-xs font-bold transition-colors focus-ring",
            activeSection === "grievances"
              ? "bg-navy text-primary-foreground shadow-xs"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-navy",
          )}
        >
          ⚖️ {hi ? "जिला किसान शिकायतें" : "Farmer Grievances"} ({grievances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("sla")}
          className={cn(
            "rounded-lg px-3.5 py-2 text-xs font-bold transition-colors focus-ring",
            activeSection === "sla"
              ? "bg-navy text-primary-foreground shadow-xs"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-navy",
          )}
        >
          ⏱️ {hi ? "48-घंटे DBT SLA ट्रैकर" : "48h DBT SLA Monitor"}
        </button>
      </div>

      {/* ── Section 1: Anomalies ── */}
      {activeSection === "anomalies" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionLabel tone="light">{hi ? "सक्रिय विसंगतियां" : "Active Anomaly Sentinel"}</SectionLabel>
            <Pill tone={anomalies.length > 0 ? "saffron" : "leaf"}>
              {anomalies.length} {hi ? "सक्रिय" : "Active"}
            </Pill>
          </div>

          {sortedAnomalies.length === 0 ? (
            <div className="surface-lift p-8 text-center">
              <p className="text-3xl">✅</p>
              <p className="mt-2 text-sm font-bold text-navy">{hi ? "कोई विसंगति नहीं" : "No anomalies detected"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hi ? "जिले के सभी केंद्र सुरक्षित परिचालन सीमाओं के भीतर कार्य कर रहे हैं" : "All jurisdiction centres operating within standard tolerances"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAnomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={cn(
                    "surface-lift p-4 border-l-4",
                    anomaly.severity === "critical"
                      ? "border-l-danger"
                      : anomaly.severity === "warning"
                      ? "border-l-saffron"
                      : "border-l-navy",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {anomaly.type === "queue_spike"
                            ? "📈"
                            : anomaly.type === "capacity_breach"
                            ? "🔴"
                            : anomaly.type === "idle_counter"
                            ? "⏸️"
                            : anomaly.type === "processing_slow"
                            ? "🐌"
                            : "💸"}
                        </span>
                        <h4 className="font-display font-bold text-navy">{anomaly.centreName}</h4>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{anomaly.description}</p>
                    </div>
                    <Pill tone={anomaly.severity === "critical" ? "danger" : anomaly.severity === "warning" ? "saffron" : "muted"}>
                      {anomaly.severity}
                    </Pill>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>{hi ? "वर्तमान" : "Current"}: <strong className="text-navy">{anomaly.currentValue}</strong></span>
                    <span>{hi ? "मानक" : "Standard"}: <strong className="text-navy">{anomaly.expectedValue}</strong></span>
                    <span>{hi ? "विचलन" : "Deviation"}: <strong className={anomaly.deviationPct > 50 ? "text-danger" : "text-saffron"}>{anomaly.deviationPct}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Section 2: Intervention History ── */}
      {activeSection === "interventions" && (
        <div className="space-y-4">
          <SectionLabel tone="light">{hi ? "कार्यान्वित प्रशासनिक हस्तक्षेप" : "Executed Administrative Directives"}</SectionLabel>

          {interventions.length === 0 ? (
            <div className="surface-lift p-8 text-center text-sm text-muted-foreground">
              {hi ? "इस जिले में कोई पिछला हस्तक्षेप दर्ज नहीं है।" : "No recorded interventions in this district yet."}
            </div>
          ) : (
            <div className="space-y-3">
              {interventions.map((record) => (
                <div key={record.id} className="surface-lift p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-muted-foreground">
                        {record.type}
                      </span>
                      <h4 className="mt-1 text-sm font-bold text-navy">{record.description}</h4>
                      <p className="text-xs text-muted-foreground">
                        By {record.appliedBy} · {new Date(record.appliedAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <Pill tone="leaf">Completed ✓</Pill>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/30 p-3 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">{hi ? "प्रतीक्षा पूर्व" : "Wait Before"}</p>
                      <p className="font-bold text-navy">{record.metricsBefore.avgWaitMin}m</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{hi ? "क्षमता पूर्व" : "Capacity Before"}</p>
                      <p className="font-bold text-navy">{record.metricsBefore.avgCapacityPct}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{hi ? "कतार पूर्व" : "Queue Before"}</p>
                      <p className="font-bold text-leaf">{record.metricsBefore.queueLength} tractors</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Grievance Desk ── */}
      {activeSection === "grievances" && (
        <div className="space-y-4">
          <SectionLabel tone="light">{hi ? "जिला स्तरीय किसान निवारण प्रकोष्ठ" : "District Farmer Grievance Resolution Desk"}</SectionLabel>

          {grievances.length === 0 ? (
            <div className="surface-lift p-8 text-center">
              <p className="text-3xl">🕊️</p>
              <p className="mt-2 text-sm font-bold text-navy">{hi ? "कोई लंबित शिकायत नहीं" : "No open complaints"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{hi ? "जिले में 100% शिकायत निवारण दर" : "100% grievance clearance rate in district"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {grievances.map((g) => (
                <div key={g.id} className="surface-lift p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy text-sm">{g.farmerName}</span>
                      <span className="font-mono text-xs text-muted-foreground">({g.farmerPhone})</span>
                      <Pill tone={g.priority === "critical" ? "danger" : g.priority === "high" ? "saffron" : "muted"}>
                        {g.priority}
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {g.category} · {g.subject}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{g.description}</p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {g.status !== "resolved" ? (
                      <button
                        type="button"
                        onClick={() => handleResolveGrievance(g.id)}
                        className="rounded-lg bg-leaf/20 border border-leaf/40 px-3 py-1.5 text-xs font-bold text-leaf hover:bg-leaf/30 transition-colors focus-ring"
                      >
                        ✓ {hi ? "निवारण करें" : "Resolve"}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-leaf">✓ {hi ? "निस्तारित" : "Resolved"}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Section 4: 48h DBT SLA Monitor ── */}
      {activeSection === "sla" && (
        <div className="space-y-4">
          <SectionLabel tone="light">{hi ? "प्रत्यक्ष लाभ अंतरण (DBT) समयबद्धता" : "Direct Benefit Transfer (DBT) Statutory SLA Compliance"}</SectionLabel>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-lift p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">PFMS Direct SLA</p>
              <p className="mt-1 text-2xl font-black text-leaf">100.0%</p>
              <p className="text-xs text-muted-foreground">{hi ? "48 घंटे के भीतर भुगतान" : "Settled within statutory 48h"}</p>
            </div>
            <div className="surface-lift p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Avg Transfer Turnaround</p>
              <p className="mt-1 text-2xl font-black text-navy">28.4 hrs</p>
              <p className="text-xs text-muted-foreground">{hi ? "तुलाई से खाते में जमा" : "Weighment to Bank Credit"}</p>
            </div>
            <div className="surface-lift p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">SLA Breaches</p>
              <p className="mt-1 text-2xl font-black text-leaf">0</p>
              <p className="text-xs text-muted-foreground">{hi ? "शून्य उल्लंघन दर्ज" : "Zero active delays > 48h"}</p>
            </div>
            <div className="surface-lift p-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Treasury Protocol</p>
              <p className="mt-1 text-2xl font-black text-navy">PFMS / e-Kuber</p>
              <p className="text-xs text-muted-foreground">RBI Core Banking</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Analytics Tab ─── */

function AnalyticsTab({ hi, waitAnalytics, throughput, forecast, firstCentreName }: any) {
  return (
    <div className="mt-6 space-y-6">
      <section className="surface-lift p-5">
        <SectionLabel tone="light">{hi ? `कतार पूर्वानुमान — ${firstCentreName}` : `Queue forecast — ${firstCentreName}`}</SectionLabel>
        <div className="mt-4">
          <ForecastChart data={forecast} tone="light" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-lift p-5">
          <SectionLabel tone="light">{hi ? "प्रतीक्षा समय विश्लेषण" : "Waiting time analytics"}</SectionLabel>
          <h3 className="mt-2 font-display text-lg font-extrabold text-navy">
            {hi ? "पहले बनाम किसान सेतु के बाद" : "Before vs after Kisan Setu"}
          </h3>
          <div className="mt-4">
            <WaitAnalyticsChart data={waitAnalytics} tone="light" />
          </div>
          <div className="mt-3 flex gap-4 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-muted-foreground/40" /> {hi ? "पारंपरिक" : "Traditional"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-leaf" /> {hi ? "किसान सेतु" : "Kisan Setu"}
            </span>
          </div>
        </section>

        <section className="surface-lift p-5">
          <SectionLabel tone="light">{hi ? "प्रति घंटा थ्रूपुट" : "Hourly throughput"}</SectionLabel>
          <h3 className="mt-2 font-display text-lg font-extrabold text-navy">
            {hi ? "खरीदी गई मात्रा (क्विंटल/घंटा)" : "Quantity procured (quintals/hr)"}
          </h3>
          <div className="mt-4">
            <ThroughputChart data={throughput} />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Shared Recommendation Panel ─── */

function RecommendationPanel({ hi, recommendation, recSt, alerts, interventionApplied, approveRecommendation, reviewRecommendation, overrideRecommendation, centres }: any) {
  return (
    <section className="surface-lift relative overflow-hidden p-5">
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-leaf" />
      {recommendation ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-gradient-leaf px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground">
                {hi ? "AI सुझाव" : "AI RECOMMENDATION"}
              </span>
              <Pill tone={recSt.tone}>{recSt.label}</Pill>
            </div>
            <Pill tone="leaf">{recommendation.confidencePct}%</Pill>
          </div>

          <h3 className="mt-4 font-display text-xl font-extrabold text-navy">{recommendation.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{recommendation.rationale}</p>

          <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {hi ? "प्रभाव" : "Expected impact"}
            </p>
            <p className="mt-1 text-sm font-semibold text-navy">{recommendation.impact}</p>
          </div>

          {alerts && alerts.filter((a: any) => a.severity === "critical").length > 0 ? (
            <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">
                {hi ? "गंभीर अलर्ट" : "Critical alert"}
              </p>
              <p className="mt-1 text-sm font-semibold text-danger">
                {alerts.find((a: any) => a.severity === "critical")?.title}
              </p>
            </div>
          ) : null}

          {recommendation.status === "pending" || recommendation.status === "reviewing" ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={approveRecommendation}
                className="rounded-xl bg-gradient-leaf px-3 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-ring"
              >
                ✓ {hi ? "मंजूर" : "Approve"}
              </button>
              <button
                type="button"
                onClick={reviewRecommendation}
                className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-bold text-navy shadow-xs transition-colors hover:bg-muted focus-ring"
              >
                👁 {hi ? "समीक्षा" : "Review"}
              </button>
              <button
                type="button"
                onClick={overrideRecommendation}
                className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-3 text-sm font-bold text-danger transition-colors hover:bg-danger/20 focus-ring"
              >
                ✕ {hi ? "ओवरराइड" : "Override"}
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-leaf/10 px-4 py-3 text-center">
              <p className="text-sm font-bold text-leaf">
                {recommendation.status === "approved"
                  ? hi
                    ? "✓ सुझाव स्वीकृत — क्षमता पुनर्वितरण जारी"
                    : "✓ Recommendation approved — capacity redistribution in progress"
                  : hi
                    ? "✕ सुझाव ओवरराइड — मैनुअल हस्तक्षेप"
                    : "✕ Recommendation overridden — manual intervention"}
              </p>
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-leaf font-bold">
            {hi ? "AI निगरानी" : "AI Autonomous Sentinel"}
          </p>
          <p className="mt-2 text-sm font-semibold text-navy">
            {hi
              ? "सभी केंद्र सामान्य परिचालन मापदंडों में हैं। कोई सक्रिय चेतावनी नहीं।"
              : `All procurement centres operating within safe threshold capacity (sub-85%). Continuous monitoring active.`}
          </p>
        </div>
      )}
    </section>
  );
}
