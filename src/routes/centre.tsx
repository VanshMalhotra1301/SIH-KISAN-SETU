import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageShell } from "@/components/kisan/app-shell";
import { AuthGuard } from "@/components/kisan/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { ForecastChart, RadialGauge } from "@/components/kisan/charts";
import {
  CapacityBar,
  HealthDot,
  Pill,
  PrototypeBadge,
  SectionLabel,
  StatCard,
} from "@/components/kisan/primitives";
import { centreHealth, useKisan } from "@/lib/kisan/store";
import type { AiRecommendation, CentreAlert, ProcurementCentre, QueueRow } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/centre")({
  head: () => ({
    meta: [
      { title: "Procurement Centre Dashboard — Live Queue & AI Intelligence | KISAN SETU" },
      {
        name: "description",
        content:
          "Operational dashboard for centre in-charge: live queue, utilization, processing rate, AI congestion predictions and capacity balancing recommendations.",
      },
      { property: "og:title", content: "KISAN SETU — Procurement Centre Dashboard" },
      {
        property: "og:description",
        content: "AI operational intelligence for procurement centre operators.",
      },
    ],
  }),
  component: CentrePageGuarded,
});

/* ─── Status styling ─── */

const statusConfig: Record<QueueRow["status"], { label: string; tone: "leaf" | "saffron" | "navy" | "muted" | "danger" }> = {
  waiting: { label: "Waiting", tone: "saffron" },
  grading: { label: "Grading", tone: "navy" },
  weighing: { label: "Weighing", tone: "leaf" },
  payment: { label: "Payment", tone: "leaf" },
  done: { label: "Done", tone: "muted" },
};

const severityStyles: Record<CentreAlert["severity"], string> = {
  critical: "border-danger/50 bg-danger-soft",
  warning: "border-saffron/50 bg-saffron-soft",
  info: "border-leaf/40 bg-leaf-soft",
};

const severityIcon: Record<CentreAlert["severity"], string> = {
  critical: "🔴",
  warning: "🟡",
  info: "🟢",
};

const recStatusStyles: Record<AiRecommendation["status"], { label: string; tone: "saffron" | "leaf" | "muted" | "danger" | "navy" }> = {
  pending: { label: "Pending", tone: "saffron" },
  reviewing: { label: "Under review", tone: "navy" },
  approved: { label: "Approved", tone: "leaf" },
  overridden: { label: "Overridden", tone: "muted" },
};

/* ─── Page ─── */

function CentrePageGuarded() {
  return (
    <AuthGuard allowedRoles={["centre_operator", "super_admin"]}>
      <CentrePage />
    </AuthGuard>
  );
}

function CentrePage() {
  const { user } = useAuth();
  const {
    language,
    centres,
    queueRows,
    alerts,
    recommendation,
    forecast,
    overloadTriggered,
    interventionApplied,
    triggerOverload,
    reviewRecommendation,
    approveRecommendation,
    overrideRecommendation,
    summary,
  } = useKisan();
  const hi = language === "hi";

  /* Use the operator's assigned centre, or fall back to first centre */
  const activeCentre = (user?.centreId ? centres.find((c) => c.id === user.centreId) : null) ?? centres[0];
  const avgWait = centres.length ? Math.round(centres.reduce((n, c) => n + c.predictedWaitMin, 0) / centres.length) : 0;

  if (!activeCentre) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-3xl">🏢</p>
            <h2 className="mt-3 font-display text-xl font-extrabold text-navy">{hi ? "डेटा लोड हो रहा है..." : "Loading centre data..."}</h2>
            <div className="mt-4 size-8 mx-auto animate-spin rounded-full border-4 border-leaf border-t-transparent" />
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionLabel>{hi ? "खरीद केंद्र डैशबोर्ड" : "Procurement Centre Dashboard"}</SectionLabel>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-navy sm:text-4xl">
            {hi ? activeCentre.nameHi : activeCentre.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <PrototypeBadge />
          <SimulationControls
            hi={hi}
            overloadTriggered={overloadTriggered}
            interventionApplied={interventionApplied}
            onTrigger={triggerOverload}
          />
        </div>
      </div>

      {/* ── KPI cards ── */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={hi ? "आज के किसान" : "Farmers today"} value={activeCentre.farmersToday} accent="navy" />
        <StatCard label={hi ? "कतार में" : "Current queue"} value={activeCentre.queueLength} accent="saffron" />
        <StatCard
          label={hi ? "औसत प्रतीक्षा" : "Avg wait"}
          value={activeCentre.predictedWaitMin}
          unit="min"
          accent={activeCentre.predictedWaitMin > 100 ? "danger" : "leaf"}
        />
        <StatCard
          label={hi ? "उपयोग" : "Utilization"}
          value={activeCentre.capacityUsedPct}
          unit="%"
          accent={activeCentre.capacityUsedPct >= 85 ? "danger" : activeCentre.capacityUsedPct >= 65 ? "saffron" : "leaf"}
        />
        <StatCard label={hi ? "प्रोसेसिंग रेट" : "Processing rate"} value={activeCentre.processingRatePerHour} unit="/hr" accent="leaf" />
        <StatCard
          label={hi ? "सक्रिय काउंटर" : "Active counters"}
          value={`${activeCentre.activeCounters}/${activeCentre.totalCounters}`}
          accent="navy"
        />
      </section>

      {/* ── Main grid: Queue + AI ── */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Left: Queue table + chart */}
        <div className="space-y-6">
          <QueueTable rows={queueRows} hi={hi} />
          <section className="surface p-5">
            <SectionLabel>{hi ? "कतार पूर्वानुमान — केंद्र A" : "Queue forecast — Centre A"}</SectionLabel>
            <h3 className="mt-2 font-display text-lg font-extrabold text-navy">
              {hi ? "वास्तविक बनाम अनुमानित कतार" : "Actual vs predicted queue"}
            </h3>
            <div className="mt-4">
              <ForecastChart data={forecast} tone="light" />
            </div>
            <div className="mt-3 flex gap-4 text-xs font-semibold text-muted-foreground">
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

        {/* Right: AI intelligence + capacity */}
        <div className="space-y-6">
          <AlertsPanel alerts={alerts} hi={hi} />
          <AiRecommendationCard
            rec={recommendation}
            hi={hi}
            onApprove={approveRecommendation}
            onReview={reviewRecommendation}
            onOverride={overrideRecommendation}
          />
          <CapacityOverview centres={centres} hi={hi} />
        </div>
      </div>
    </PageShell>
  );
}

/* ─── Sub-components ─── */

function SimulationControls({
  hi,
  overloadTriggered,
  interventionApplied,
  onTrigger,
}: {
  hi: boolean;
  overloadTriggered: boolean;
  interventionApplied: boolean;
  onTrigger: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {!overloadTriggered ? (
        <button
          type="button"
          onClick={onTrigger}
          className="rounded-xl bg-gradient-saffron px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-ring"
        >
          ⚡ {hi ? "सर्ज ट्रिगर करें" : "Trigger surge"}
        </button>
      ) : null}
    </div>
  );
}

function QueueTable({ rows, hi }: { rows: QueueRow[]; hi: boolean }) {
  const sorted = [...rows].sort((a, b) => {
    const order: Record<QueueRow["status"], number> = { weighing: 0, grading: 1, waiting: 2, payment: 3, done: 4 };
    return order[a.status] - order[b.status];
  });

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <SectionLabel>{hi ? "लाइव कतार" : "Live queue"}</SectionLabel>
          <h3 className="mt-1 font-display text-lg font-extrabold text-navy">
            {rows.length} {hi ? "किसान" : "farmers"}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-leaf">
          <span className="size-1.5 rounded-full bg-leaf animate-blip" /> {hi ? "लाइव" : "Live"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-4 py-3">{hi ? "टोकन" : "Token"}</th>
              <th className="px-4 py-3">{hi ? "किसान" : "Farmer"}</th>
              <th className="hidden px-4 py-3 sm:table-cell">{hi ? "फ़सल" : "Crop"}</th>
              <th className="hidden px-4 py-3 md:table-cell">{hi ? "मात्रा" : "Qty"}</th>
              <th className="px-4 py-3">{hi ? "स्लॉट" : "Slot"}</th>
              <th className="hidden px-4 py-3 sm:table-cell">{hi ? "प्रतीक्षा" : "Waited"}</th>
              <th className="px-4 py-3">{hi ? "स्थिति" : "Status"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((row) => {
              const isDemoFarmer = row.token === "KS-3842";
              const cfg = statusConfig[row.status];
              return (
                <tr
                  key={row.token}
                  className={cn(
                    "transition-colors",
                    isDemoFarmer ? "bg-leaf-soft/50" : "hover:bg-muted/30",
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-display font-bold tabular-nums text-navy">
                    {row.token}
                    {isDemoFarmer ? (
                      <span className="ml-1.5 text-[10px] font-semibold text-leaf">★</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy">{row.farmerName}</p>
                    <p className="text-xs text-muted-foreground">{row.village}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{row.crop}</td>
                  <td className="hidden px-4 py-3 tabular-nums text-muted-foreground md:table-cell">
                    {row.quantityQuintals} qtl
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-muted-foreground">{row.slotWindow}</td>
                  <td className="hidden px-4 py-3 tabular-nums text-muted-foreground sm:table-cell">
                    {row.waitedMin > 0 ? `${row.waitedMin} min` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={cfg.tone}>{cfg.label}</Pill>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AlertsPanel({ alerts, hi }: { alerts: CentreAlert[]; hi: boolean }) {
  if (alerts.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionLabel>{hi ? "अलर्ट" : "Operational alerts"}</SectionLabel>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "animate-rise rounded-xl border-2 p-4",
            severityStyles[alert.severity],
          )}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-base" aria-hidden>{severityIcon[alert.severity]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-navy">{alert.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{alert.detail}</p>
              {alert.atMinutes != null ? (
                <p className="mt-2 text-xs font-bold text-danger">
                  ⏱ {hi ? `${alert.atMinutes} मिनट में` : `in ${alert.atMinutes} minutes`}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function AiRecommendationCard({
  rec,
  hi,
  onApprove,
  onReview,
  onOverride,
}: {
  rec: AiRecommendation | null;
  hi: boolean;
  onApprove: () => void;
  onReview: () => void;
  onOverride: () => void;
}) {
  if (!rec) {
    return (
      <section className="p-5 surface border-border">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-leaf">
          {hi ? "AI निगरानी" : "AI Intelligence"}
        </p>
        <p className="mt-2 text-sm font-semibold text-navy">
          {hi ? "सभी केंद्र सामान्य क्षमता पर चल रहे हैं। किसी हस्तक्षेप की आवश्यकता नहीं है।" : "All centres operating within safe threshold. No load rebalancing required."}
        </p>
      </section>
    );
  }

  const st = recStatusStyles[rec.status];

  return (
    <section className="relative overflow-hidden surface-lift border-leaf/30">
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-leaf" />
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-gradient-leaf px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground">
              {hi ? "AI सुझाव" : "AI RECOMMENDATION"}
            </span>
            <Pill tone={st.tone}>{st.label}</Pill>
          </div>
          <Pill tone="leaf">{rec.confidencePct}%</Pill>
        </div>

        <h3 className="mt-4 font-display text-xl font-extrabold text-navy">{rec.headline}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{rec.rationale}</p>

        <div className="mt-4 rounded-xl bg-muted px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {hi ? "प्रभाव" : "Expected impact"}
          </p>
          <p className="mt-1 text-sm font-semibold text-navy">{rec.impact}</p>
        </div>

        {rec.status === "pending" || rec.status === "reviewing" ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onApprove}
              className="rounded-xl bg-gradient-leaf px-3 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-ring"
            >
              ✓ {hi ? "मंजूर" : "Approve"}
            </button>
            <button
              type="button"
              onClick={onReview}
              className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-bold text-navy transition-colors hover:bg-muted focus-ring"
            >
              👁 {hi ? "समीक्षा" : "Review"}
            </button>
            <button
              type="button"
              onClick={onOverride}
              className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-3 text-sm font-bold text-danger transition-colors hover:bg-danger/20 focus-ring"
            >
              ✕ {hi ? "ओवरराइड" : "Override"}
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-leaf-soft px-4 py-3 text-center">
            <p className="text-sm font-bold text-leaf">
              {rec.status === "approved"
                ? hi ? "✓ सुझाव स्वीकृत — कतार अपडेट हो रही है" : "✓ Recommendation approved — queues updating"
                : hi ? "✕ सुझाव ओवरराइड — मैनुअल स्टाफ़िंग चुनी गई" : "✕ Recommendation overridden — manual staffing chosen"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function CapacityOverview({ centres, hi }: { centres: ProcurementCentre[]; hi: boolean }) {
  const [selectedId, setSelectedId] = useState(centres[0]?.id ?? "");
  const selected = centres.find((c) => c.id === selectedId) ?? centres[0]!;

  return (
    <section className="surface p-5">
      <SectionLabel>{hi ? "सभी केंद्रों की क्षमता" : "District capacity overview"}</SectionLabel>
      <h3 className="mt-2 font-display text-lg font-extrabold text-navy">
        {hi ? "केंद्रवार उपयोग" : "Centre-wise utilization"}
      </h3>

      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {centres.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            className={cn(
              "transition-transform focus-ring rounded-xl p-1",
              c.id === selectedId ? "ring-2 ring-leaf scale-105" : "opacity-80 hover:opacity-100",
            )}
          >
            <RadialGauge pct={c.capacityUsedPct} label={c.code} size={86} tone="light" />
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-muted p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HealthDot health={centreHealth(selected.capacityUsedPct)} />
            <p className="font-display text-sm font-bold text-navy">{hi ? selected.nameHi : selected.name}</p>
          </div>
          <span className="text-sm font-bold tabular-nums text-navy">{selected.capacityUsedPct}%</span>
        </div>
        <CapacityBar pct={selected.capacityUsedPct} />
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="font-bold tabular-nums text-navy">{selected.queueLength}</p>
            <p className="text-muted-foreground">{hi ? "कतार" : "Queue"}</p>
          </div>
          <div>
            <p className="font-bold tabular-nums text-navy">{selected.predictedWaitMin}m</p>
            <p className="text-muted-foreground">{hi ? "प्रतीक्षा" : "Wait"}</p>
          </div>
          <div>
            <p className="font-bold tabular-nums text-navy">{selected.activeCounters}/{selected.totalCounters}</p>
            <p className="text-muted-foreground">{hi ? "काउंटर" : "Counters"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
