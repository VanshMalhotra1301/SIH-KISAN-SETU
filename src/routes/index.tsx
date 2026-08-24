import { Link, createFileRoute } from "@tanstack/react-router";

import heroImage from "@/assets/mandi-dawn.jpg";
import { PageShell } from "@/components/kisan/app-shell";
import { BeforeAfter } from "@/components/kisan/before-after";
import { PrototypeBadge, SectionLabel, StatCard } from "@/components/kisan/primitives";
import { useKisan } from "@/lib/kisan/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KISAN SETU — Predict, Optimize & Orchestrate Crop Procurement" },
      {
        name: "description",
        content:
          "KISAN SETU is a predictive procurement platform for farmers, mandi centres and district officers: smart centre finder, smart slots, virtual queue and AI congestion control.",
      },
      { property: "og:title", content: "KISAN SETU — Predictive Crop Procurement" },
      {
        property: "og:description",
        content: "From registration to procurement to payment — without the uncertainty.",
      },
    ],
  }),
  component: Landing,
});

const roles = [
  {
    to: "/farmer" as const,
    tag: "Role 01",
    title: "Farmer App",
    titleHi: "किसान ऐप",
    copy: "Voice-first, Hindi/English, large visual buttons. Smart Centre Finder, Smart Slot, live virtual queue, procurement timeline and payment status.",
    points: ["Voice assistant", "Smart Slot 11:30 – 12:00", "Token KS-3842"],
  },
  {
    to: "/centre" as const,
    tag: "Role 02",
    title: "Procurement Centre",
    titleHi: "खरीद केंद्र",
    copy: "Operational dashboard for centre in-charge: live queue, utilization, processing rate, counters, alerts and AI operational intelligence.",
    points: ["Live queue table", "Capacity visualization", "Approve / Review / Override"],
  },
  {
    to: "/control-tower" as const,
    tag: "Role 03",
    title: "District Control Tower",
    titleHi: "जिला कंट्रोल टावर",
    copy: "Dark command centre with an interactive centre map, health status, queue forecast, waiting-time analytics, throughput and AI recommendations.",
    points: ["Centre health map", "Predicted overloads", "Real-time activity feed"],
  },
];

function Landing() {
  const { language, summary } = useKisan();
  const hi = language === "hi";

  return (
    <PageShell className="pt-0">
      <section className="relative mt-6 overflow-hidden rounded-3xl bg-hero px-5 py-12 text-primary-foreground sm:px-10 sm:py-16">
        <img
          src={heroImage}
          alt="Farmers at a grain procurement mandi at dawn"
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-25 mix-blend-luminosity"
          loading="lazy"
        />
        <div className="relative max-w-3xl">
          <PrototypeBadge tone="dark" label="SIH 2026 · PS 26032 · Prototype Simulation" />
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            KISAN SETU
          </h1>
          <p className="mt-4 text-balance-tight text-lg font-semibold text-primary-foreground/90 sm:text-2xl">
            {hi
              ? "पंजीकरण से खरीद और भुगतान तक — बिना अनिश्चितता।"
              : "From registration to procurement to payment — without the uncertainty."}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/70 sm:text-base">
            {hi
              ? "कतार को केवल डिजिटल न करें। उसका पूर्वानुमान लगाएँ, अनुकूल बनाएँ और संचालित करें।"
              : "Don't just digitize the queue. Predict it, optimize it and orchestrate it."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/farmer"
              className="rounded-xl bg-gradient-leaf px-5 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-ring"
            >
              {hi ? "किसान अनुभव खोलें" : "Open farmer experience"}
            </Link>
            <Link
              to="/control-tower"
              className="rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 px-5 py-3 text-sm font-bold text-primary-foreground backdrop-blur transition-colors hover:bg-primary-foreground/20 focus-ring"
            >
              {hi ? "कंट्रोल टावर देखें" : "Enter district control tower"}
            </Link>
          </div>
        </div>

        <div className="relative mt-10 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Centres orchestrated", value: summary.totalCentres },
            { label: "Farmers served today", value: summary.farmersToday },
            { label: "Avg wait (predicted)", value: `${summary.averageWaitMin} min` },
            { label: "Overloads prevented", value: summary.predictedOverloads },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-4 py-3 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">
                {s.label}
              </p>
              <p className="font-display text-2xl font-extrabold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <SectionLabel>Three connected experiences · one shared state</SectionLabel>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-extrabold text-navy sm:text-4xl">
          One procurement nervous system
        </h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.to}
              to={role.to}
              className="surface group relative flex flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:border-leaf/40"
            >
              <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-leaf opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-leaf">{role.tag}</p>
              <h3 className="mt-2 font-display text-xl font-extrabold text-navy">
                {hi ? role.titleHi : role.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{role.copy}</p>
              <ul className="mt-5 space-y-2">
                {role.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <span className="size-1.5 rounded-full bg-leaf" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              <span className="mt-6 text-sm font-bold text-leaf">Open →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16 surface-lift overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
          <div className="bg-navy p-6 text-primary-foreground sm:p-8">
            <SectionLabel tone="dark">Live demo event</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
              Watch a congestion event resolve itself
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">
              Trigger the surge on the centre dashboard, approve the AI recommendation, and every screen —
              farmer, centre and district — updates from the same shared state.
            </p>
            <Link
              to="/centre"
              className="mt-6 inline-flex rounded-xl bg-gradient-saffron px-5 py-3 text-sm font-bold text-primary-foreground focus-ring"
            >
              Run the simulation
            </Link>
          </div>
          <ol className="divide-y divide-border">
            {[
              "Centre A crosses safe capacity — arrival rate outpaces processing rate",
              "AI predicts congestion 42 minutes before it happens",
              "Recommendation: shift 18 future appointments → Centre B",
              "District officer approves in one tap",
              "Queues, capacities, waits and farmer ETAs update everywhere",
            ].map((step, i) => (
              <li key={step} className="flex gap-4 p-5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-soft text-xs font-extrabold text-navy">
                  {i + 1}
                </span>
                <p className="text-sm font-semibold text-navy">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Avg wait — traditional" value="154" unit="min" accent="danger" hint="6-day district baseline" />
        <StatCard label="Avg wait — Kisan Setu" value="47" unit="min" accent="leaf" trend={{ direction: "down", text: "69% reduction" }} />
        <StatCard label="Slot adherence" value="93" unit="%" accent="navy" hint="Farmers arriving inside their window" />
        <StatCard label="Payment visibility" value="100" unit="%" accent="saffron" hint="Every stage tracked to bank credit" />
      </section>

      <BeforeAfter />
    </PageShell>
  );
}
