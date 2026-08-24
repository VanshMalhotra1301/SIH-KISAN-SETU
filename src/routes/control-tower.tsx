import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kisan/app-shell";
import { AuthGuard } from "@/components/kisan/auth-guard";
import { ForecastChart, ThroughputChart, WaitAnalyticsChart } from "@/components/kisan/charts";
import { DistrictMap } from "@/components/kisan/district-map";
import { Pill, PrototypeBadge, SectionLabel, StatCard } from "@/components/kisan/primitives";
import { useKisan } from "@/lib/kisan/store";
import type { ActivityEvent, AiRecommendation } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/control-tower")({
  head: () => ({
    meta: [
      { title: "District Control Tower — Live Centre Health & AI Intelligence | KISAN SETU" },
      {
        name: "description",
        content:
          "Dark command-centre dashboard for district officers: live centre map, queue forecasts, waiting-time analytics, throughput, AI congestion predictions and capacity balancing.",
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

/* ─── Recommendation status config ─── */

const recStatusConfig: Record<AiRecommendation["status"], { label: string; tone: "saffron" | "leaf" | "muted" | "navy" }> = {
  pending: { label: "Pending decision", tone: "saffron" },
  reviewing: { label: "Under review", tone: "navy" },
  approved: { label: "Approved ✓", tone: "leaf" },
  overridden: { label: "Overridden", tone: "muted" },
};

/* ─── Activity kind styling ─── */

const kindStyles: Record<ActivityEvent["kind"], { icon: string; color: string }> = {
  queue: { icon: "📋", color: "text-cyan-signal" },
  ai: { icon: "🤖", color: "text-saffron" },
  payment: { icon: "💰", color: "text-leaf" },
  centre: { icon: "🏢", color: "text-cyan-signal" },
  admin: { icon: "👤", color: "text-command-fg" },
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
    overloadTriggered,
    interventionApplied,
    triggerOverload,
    reviewRecommendation,
    approveRecommendation,
    overrideRecommendation,
    summary,
  } = useKisan();
  const hi = language === "hi";

  const recSt = recommendation ? recStatusConfig[recommendation.status] : recStatusConfig.pending;
  const activeCentres = centres.filter((c) => c.farmersToday > 0).length;

  return (
    <PageShell tone="dark">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionLabel tone="dark">{hi ? "जिला कमांड सेंटर" : "District Command Centre"}</SectionLabel>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-command-fg sm:text-4xl">
            {hi ? "कंट्रोल टावर — करनाल" : "Control Tower — Karnal"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <PrototypeBadge tone="dark" />
          {!overloadTriggered ? (
            <button
              type="button"
              onClick={triggerOverload}
              className="rounded-xl bg-gradient-saffron px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-ring"
            >
              ⚡ {hi ? "सर्ज ट्रिगर" : "Trigger surge"}
            </button>
          ) : null}
          {overloadTriggered ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-command-line bg-command-panel px-4 py-2.5 text-sm font-bold text-command-fg transition-colors hover:bg-command-line focus-ring"
            >
              ↺ {hi ? "रीसेट" : "Refresh"}
            </button>
          ) : null}
        </div>
      </div>

      {/* ── KPI row ── */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard tone="dark" label={hi ? "कुल केंद्र" : "Total centres"} value={summary.totalCentres} accent="navy" />
        <StatCard tone="dark" label={hi ? "सक्रिय केंद्र" : "Active centres"} value={activeCentres} accent="leaf" />
        <StatCard tone="dark" label={hi ? "आज के किसान" : "Farmers today"} value={summary.farmersToday} accent="navy" />
        <StatCard
          tone="dark"
          label={hi ? "खरीदी गई मात्रा" : "Qty procured"}
          value={summary.quantityProcuredQuintals.toLocaleString("en-IN")}
          unit="qtl"
          accent="leaf"
        />
        <StatCard
          tone="dark"
          label={hi ? "औसत प्रतीक्षा" : "Avg wait"}
          value={summary.averageWaitMin}
          unit="min"
          accent={summary.averageWaitMin > 80 ? "danger" : "leaf"}
          trend={{ direction: "down", text: hi ? "69% कमी" : "69% reduction" }}
        />
        <StatCard
          tone="dark"
          label={hi ? "अनुमानित ओवरलोड" : "Predicted overloads"}
          value={summary.predictedOverloads}
          accent="danger"
        />
      </section>

      {/* ── Map + Intelligence ── */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Left: Map + Forecast */}
        <div className="space-y-6">
          <section>
            <SectionLabel tone="dark">{hi ? "जिला केंद्र स्वास्थ्य" : "District centre health"}</SectionLabel>
            <h2 className="mt-2 font-display text-xl font-extrabold text-command-fg">
              {hi ? "लाइव सेंटर मैप" : "Live centre map"}
            </h2>
            <div className="mt-4">
              <DistrictMap centres={centres} />
            </div>
          </section>

          <section className="panel-command p-5">
            <SectionLabel tone="dark">{hi ? "कतार पूर्वानुमान — केंद्र A" : "Queue forecast — Centre A"}</SectionLabel>
            <h3 className="mt-2 font-display text-lg font-extrabold text-command-fg">
              {hi ? "वास्तविक बनाम अनुमानित" : "Actual vs predicted queue"}
            </h3>
            <div className="mt-4">
              <ForecastChart data={forecast} tone="dark" />
            </div>
            <div className="mt-3 flex gap-4 text-xs font-semibold text-command-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-leaf" /> {hi ? "वास्तविक" : "Actual"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-cyan-signal" /> {hi ? "अनुमानित" : "Predicted"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-danger" /> {hi ? "सुरक्षित क्षमता" : "Safe capacity"}
              </span>
            </div>
          </section>
        </div>

        {/* Right: AI + Feed */}
        <div className="space-y-6">
          {/* AI Recommendation */}
          <section className="panel-command relative overflow-hidden p-5">
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

                <h3 className="mt-4 font-display text-xl font-extrabold text-command-fg">{recommendation.headline}</h3>
                <p className="mt-2 text-sm leading-relaxed text-command-muted">{recommendation.rationale}</p>

                <div className="mt-4 rounded-xl border border-command-line bg-command/60 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-command-muted">
                    {hi ? "प्रभाव" : "Expected impact"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-command-fg">{recommendation.impact}</p>
                </div>

                {/* Alerts summary */}
                {alerts.filter((a) => a.severity === "critical").length > 0 ? (
                  <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">
                      {hi ? "गंभीर अलर्ट" : "Critical alert"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-danger">
                      {alerts.find((a) => a.severity === "critical")?.title}
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
                      className="rounded-xl border border-command-line bg-command-panel px-3 py-3 text-sm font-bold text-command-fg transition-colors hover:bg-command-line focus-ring"
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-signal">
                  {hi ? "AI निगरानी" : "AI Autonomous Sentinel"}
                </p>
                <p className="mt-2 text-sm font-semibold text-command-fg">
                  {hi
                    ? "सभी केंद्र सामान्य परिचालन मापदंडों में हैं। कोई सक्रिय चेतावनी नहीं।"
                    : "All 5 mandi centres operating within safe threshold capacity (sub-85%). Continuous ML monitoring active."}
                </p>
              </div>
            )}
          </section>

          {/* Live Intelligence Feed */}
          <section className="panel-command overflow-hidden">
            <div className="flex items-center justify-between border-b border-command-line px-5 py-4">
              <div>
                <SectionLabel tone="dark">{hi ? "लाइव इंटेलिजेंस फ़ीड" : "Live intelligence feed"}</SectionLabel>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-command-line/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-command-muted">
                <span className="size-1.5 rounded-full bg-cyan-signal animate-blip" /> {hi ? "लाइव" : "Live"}
              </span>
            </div>
            <div className="max-h-80 divide-y divide-command-line/50 overflow-y-auto">
              {activity.map((event) => {
                const kind = kindStyles[event.kind];
                return (
                  <div key={event.id} className="flex gap-3 px-5 py-3 animate-rise">
                    <span className="mt-0.5 shrink-0 text-sm" aria-hidden>{kind.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-command-fg">{event.message}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-command-muted">{event.at}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── Analytics row ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel-command p-5">
          <SectionLabel tone="dark">{hi ? "प्रतीक्षा समय विश्लेषण" : "Waiting time analytics"}</SectionLabel>
          <h3 className="mt-2 font-display text-lg font-extrabold text-command-fg">
            {hi ? "पहले बनाम किसान सेतु के बाद" : "Before vs after Kisan Setu"}
          </h3>
          <div className="mt-4">
            <WaitAnalyticsChart data={waitAnalytics} tone="dark" />
          </div>
          <div className="mt-3 flex gap-4 text-xs font-semibold text-command-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-command-line" /> {hi ? "पारंपरिक" : "Traditional"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-leaf" /> {hi ? "किसान सेतु" : "Kisan Setu"}
            </span>
          </div>
        </section>

        <section className="panel-command p-5">
          <SectionLabel tone="dark">{hi ? "प्रति घंटा थ्रूपुट" : "Hourly throughput"}</SectionLabel>
          <h3 className="mt-2 font-display text-lg font-extrabold text-command-fg">
            {hi ? "खरीदी गई मात्रा (क्विंटल/घंटा)" : "Quantity procured (quintals/hr)"}
          </h3>
          <div className="mt-4">
            <ThroughputChart data={throughput} />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
