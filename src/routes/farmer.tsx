import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/kisan/app-shell";
import { CapacityBar, HealthDot, Pill, PrototypeBadge, SectionLabel } from "@/components/kisan/primitives";
import { VoiceAssistant } from "@/components/kisan/voice-assistant";
import { centreHealth, useKisan } from "@/lib/kisan/store";
import type { ProcurementCentre } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/farmer")({
  head: () => ({
    meta: [
      { title: "Farmer App — Smart Centre, Smart Slot & Virtual Queue | KISAN SETU" },
      {
        name: "description",
        content:
          "Voice-first farmer experience in Hindi and English: find the best procurement centre, get a smart slot, track your virtual queue token, timeline and payment.",
      },
      { property: "og:title", content: "KISAN SETU Farmer App — voice-first procurement" },
      {
        property: "og:description",
        content: "Ask in Hindi, get your centre, slot, token, ETA and payment status.",
      },
    ],
  }),
  component: FarmerPage,
});

function FarmerPage() {
  const { language, farmer, centres, slot, ticket, timeline, payment, interventionApplied } = useKisan();
  const hi = language === "hi";
  const smartCentres = centres.slice(0, 3);
  const recommended = smartCentres.find((c) => c.recommended);

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <section className="surface-lift overflow-hidden">
          <div className="bg-navy px-5 py-5 text-primary-foreground">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/60">
                  {hi ? "नमस्ते" : "Welcome"}
                </p>
                <h1 className="mt-1 font-display text-2xl font-extrabold">
                  {hi ? farmer.nameHi : farmer.name}
                </h1>
                <p className="mt-1 text-sm text-primary-foreground/70">
                  {hi ? farmer.villageHi : farmer.village} · {farmer.district}
                </p>
              </div>
              <PrototypeBadge tone="dark" />
            </div>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-border">
            <div className="p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {hi ? "फ़सल" : "Crop"}
              </dt>
              <dd className="mt-1 font-display text-xl font-extrabold text-navy">
                {hi ? farmer.cropHi : farmer.crop}
              </dd>
            </div>
            <div className="p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {hi ? "मात्रा" : "Quantity"}
              </dt>
              <dd className="mt-1 font-display text-xl font-extrabold text-navy">
                {farmer.quantityQuintals} <span className="text-sm">{hi ? "क्विंटल" : "quintals"}</span>
              </dd>
            </div>
          </dl>
          <div className="border-t border-border bg-muted px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              {hi ? "किसान आईडी" : "Farmer ID"} · <span className="text-navy">{farmer.farmerId}</span>
            </p>
          </div>
        </section>

        <RegistrationCard />

        <VoiceAssistant />

        <section>
          <SectionLabel>{hi ? "स्मार्ट सेंटर फाइंडर" : "Smart Centre Finder"}</SectionLabel>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-navy">
            {hi ? "आपके लिए सबसे अच्छा केंद्र" : "The best centre for you today"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {hi
              ? "दूरी, कतार, क्षमता और प्रसंस्करण गति के आधार पर तुलना"
              : "Ranked on distance, live queue, capacity and processing speed"}
          </p>
          <div className="mt-4 space-y-4">
            {smartCentres.map((centre) => (
              <CentreCard key={centre.id} centre={centre} hi={hi} />
            ))}
          </div>
        </section>

        {recommended ? (
          <section className="surface-lift border-leaf/40 p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-gradient-leaf px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground">
                {hi ? "स्मार्ट स्लॉट" : "SMART SLOT"}
              </span>
              <Pill tone="leaf">{slot.confidencePct}% {hi ? "विश्वास" : "confidence"}</Pill>
            </div>
            <p className="mt-4 font-display text-4xl font-extrabold tracking-tight text-navy">{slot.window}</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {slot.date} · {hi ? recommended.nameHi : recommended.name}
            </p>
            <p className="mt-4 rounded-xl bg-leaf-soft px-4 py-3 text-sm font-semibold leading-relaxed text-navy">
              {hi ? slot.reasonHi : slot.reason}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button className="rounded-xl bg-navy px-4 py-4 text-base font-bold text-primary-foreground focus-ring">
                ✓ {hi ? "स्लॉट पक्का करें" : "Confirm slot"}
              </button>
              <button className="rounded-xl border border-border bg-card px-4 py-4 text-base font-bold text-navy focus-ring">
                🕒 {hi ? "दूसरा समय" : "Choose another time"}
              </button>
            </div>
          </section>
        ) : null}

        <VirtualQueueCard
          hi={hi}
          token={ticket.token}
          farmersAhead={ticket.farmersAhead}
          etaMinutes={ticket.etaMinutes}
          slotWindow={ticket.slotWindow}
          centreName={hi ? recommended?.nameHi : recommended?.name}
          boosted={interventionApplied}
        />

        <section className="surface p-5">
          <SectionLabel>{hi ? "खरीद प्रक्रिया" : "Procurement timeline"}</SectionLabel>
          <ol className="mt-5 space-y-1">
            {timeline.map((step, i) => (
              <li key={step.id} className="relative flex gap-4 pb-5 last:pb-0">
                {i < timeline.length - 1 ? (
                  <span
                    className={cn(
                      "absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5",
                      step.state === "done" ? "bg-leaf/50" : "bg-border",
                    )}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                    step.state === "done" && "bg-leaf text-primary-foreground",
                    step.state === "active" && "bg-gradient-saffron text-primary-foreground",
                    step.state === "upcoming" && "bg-muted text-muted-foreground",
                  )}
                >
                  {step.state === "done" ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={cn(
                        "font-display text-base font-bold",
                        step.state === "upcoming" ? "text-muted-foreground" : "text-navy",
                      )}
                    >
                      {hi ? step.labelHi : step.label}
                    </p>
                    {step.timestamp ? (
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                        {step.timestamp}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{hi ? step.detailHi : step.detail}</p>
                  {step.state === "active" ? (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-saffron-soft px-2.5 py-1 text-[11px] font-bold text-navy">
                      <span className="size-1.5 rounded-full bg-saffron animate-blip" />
                      {hi ? "अभी चल रहा है" : "In progress"}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <SectionLabel>{hi ? "भुगतान स्थिति" : "Payment status"}</SectionLabel>
            <Pill tone="leaf">{hi ? "स्वीकृत" : "Approved"}</Pill>
          </div>
          <div className="p-5">
            <p className="font-display text-3xl font-extrabold text-navy">
              ₹{payment.grossAmount.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {payment.quintals} {hi ? "क्विंटल" : "quintals"} × ₹{payment.ratePerQuintal.toLocaleString("en-IN")} (MSP)
            </p>
            <div className="mt-5">
              <CapacityBar pct={payment.progressPct} showTicks={false} />
              <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em]">
                {[
                  hi ? "सत्यापन" : "Verified",
                  hi ? "स्वीकृत" : "Approved",
                  hi ? "हस्तांतरण" : "Transfer",
                  hi ? "बैंक जमा" : "Credited",
                ].map((label, i) => (
                  <span key={label} className={i <= 1 ? "text-leaf" : "text-muted-foreground"}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-muted px-4 py-3">
              <p className="text-sm font-semibold text-navy">
                {hi ? payment.expectedCreditInHi : payment.expectedCreditIn}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hi ? "खाता" : "Account"}: {payment.bankMasked}
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function RegistrationCard() {
  const { language, farmer } = useKisan();
  const hi = language === "hi";
  const [crop, setCrop] = useState(farmer.crop);
  const [quantity, setQuantity] = useState(String(farmer.quantityQuintals));
  const [saved, setSaved] = useState(true);

  const crops = [
    { id: "Wheat", hi: "गेहूँ", icon: "🌾" },
    { id: "Paddy", hi: "धान", icon: "🌱" },
    { id: "Mustard", hi: "सरसों", icon: "🌼" },
    { id: "Gram", hi: "चना", icon: "🫘" },
  ];

  return (
    <section className="surface p-5">
      <SectionLabel>{hi ? "पंजीकरण" : "Registration"}</SectionLabel>
      <h2 className="mt-2 font-display text-xl font-extrabold text-navy">
        {hi ? "फ़सल और मात्रा" : "Crop & quantity"}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {crops.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCrop(c.id);
              setSaved(false);
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-sm font-bold transition-colors focus-ring",
              crop === c.id ? "border-leaf bg-leaf-soft text-navy" : "border-border bg-card text-muted-foreground",
            )}
          >
            <span className="text-2xl" aria-hidden>
              {c.icon}
            </span>
            {hi ? c.hi : c.id}
          </button>
        ))}
      </div>
      <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {hi ? "मात्रा (क्विंटल)" : "Quantity (quintals)"}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setQuantity((q) => String(Math.max(0, Number(q) - 10)));
            setSaved(false);
          }}
          className="size-14 rounded-xl border border-border bg-card text-2xl font-bold text-navy focus-ring"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <input
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value.replace(/\D/g, ""));
            setSaved(false);
          }}
          inputMode="numeric"
          className="h-14 flex-1 rounded-xl border border-input bg-card text-center font-display text-2xl font-extrabold text-navy focus-ring"
          aria-label={hi ? "मात्रा" : "Quantity"}
        />
        <button
          type="button"
          onClick={() => {
            setQuantity((q) => String(Number(q) + 10));
            setSaved(false);
          }}
          className="size-14 rounded-xl border border-border bg-card text-2xl font-bold text-navy focus-ring"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={() => setSaved(true)}
        className={cn(
          "mt-4 w-full rounded-xl px-4 py-4 text-base font-bold transition-colors focus-ring",
          saved ? "bg-leaf-soft text-leaf" : "bg-gradient-leaf text-primary-foreground",
        )}
      >
        {saved ? (hi ? "✓ पंजीकरण सुरक्षित" : "✓ Registration saved") : hi ? "पंजीकरण सुरक्षित करें" : "Save registration"}
      </button>
    </section>
  );
}

function CentreCard({ centre, hi }: { centre: ProcurementCentre; hi: boolean }) {
  const [showWhy, setShowWhy] = useState(centre.recommended ?? false);
  const health = centreHealth(centre.capacityUsedPct);
  const reasons = (hi ? centre.recommendationReasonsHi : centre.recommendationReasons) ?? [];

  return (
    <article
      className={cn(
        "relative overflow-hidden p-5",
        centre.recommended ? "surface-lift border-leaf/50" : "surface",
      )}
    >
      {centre.recommended ? <span className="absolute inset-x-0 top-0 h-1 bg-gradient-leaf" /> : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-navy font-display text-sm font-extrabold text-primary-foreground">
              {centre.code}
            </span>
            <h3 className="font-display text-base font-extrabold text-navy">{hi ? centre.nameHi : centre.name}</h3>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {centre.distanceKm} km · {hi ? "कतार" : "queue"} {centre.queueLength}
          </p>
        </div>
        {centre.recommended ? (
          <Pill tone="leaf">★ {hi ? "AI सुझाव" : "AI RECOMMENDED"}</Pill>
        ) : (
          <HealthDot health={health} />
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted px-2 py-3">
          <p className="font-display text-xl font-extrabold text-navy tabular-nums">{centre.predictedWaitMin}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {hi ? "मिनट प्रतीक्षा" : "min wait"}
          </p>
        </div>
        <div className="rounded-xl bg-muted px-2 py-3">
          <p className="font-display text-xl font-extrabold text-navy tabular-nums">{centre.queueLength}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {hi ? "कतार" : "in queue"}
          </p>
        </div>
        <div className="rounded-xl bg-muted px-2 py-3">
          <p className="font-display text-xl font-extrabold text-navy tabular-nums">{centre.capacityUsedPct}%</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {hi ? "क्षमता" : "capacity"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <CapacityBar pct={centre.capacityUsedPct} />
      </div>

      {reasons.length ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-navy px-4 py-3 text-sm font-bold text-primary-foreground focus-ring"
          >
            {hi ? "यह केंद्र क्यों?" : "Why this centre?"}
            <span aria-hidden>{showWhy ? "▲" : "▼"}</span>
          </button>
          {showWhy ? (
            <ul className="mt-3 animate-rise space-y-2 rounded-xl border border-leaf/30 bg-leaf-soft p-4">
              {reasons.map((r) => (
                <li key={r} className="flex gap-2 text-sm font-semibold leading-relaxed text-navy">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-leaf" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          {hi
            ? `प्रतीक्षा ${centre.predictedWaitMin} मिनट · ${centre.activeCounters}/${centre.totalCounters} काउंटर चालू`
            : `Predicted wait ${centre.predictedWaitMin} min · ${centre.activeCounters}/${centre.totalCounters} counters active`}
        </p>
      )}
    </article>
  );
}

function VirtualQueueCard({
  hi,
  token,
  farmersAhead,
  etaMinutes,
  slotWindow,
  centreName,
  boosted,
}: {
  hi: boolean;
  token: string;
  farmersAhead: number;
  etaMinutes: number;
  slotWindow: string;
  centreName?: string;
  boosted: boolean;
}) {
  const [eta, setEta] = useState(etaMinutes);
  useEffect(() => setEta(etaMinutes), [etaMinutes]);
  useEffect(() => {
    const id = window.setInterval(() => setEta((v) => (v > 1 ? v - 1 : v)), 20000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="surface-lift overflow-hidden">
      <div className="bg-hero px-5 py-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
            {hi ? "वर्चुअल कतार" : "Virtual queue"}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
            <span className="size-1.5 rounded-full bg-leaf animate-blip" /> {hi ? "लाइव" : "Live"}
          </span>
        </div>
        <p className="mt-3 font-display text-5xl font-extrabold tracking-tight">{token}</p>
        <p className="mt-2 text-sm text-primary-foreground/70">
          {centreName} · {slotWindow}
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="p-5 text-center">
          <p className="font-display text-4xl font-extrabold tabular-nums text-navy">{farmersAhead}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {hi ? "आपसे आगे किसान" : "farmers ahead"}
          </p>
        </div>
        <div className="p-5 text-center">
          <p className="font-display text-4xl font-extrabold tabular-nums text-navy">
            {eta}
            <span className="text-base"> {hi ? "मिनट" : "min"}</span>
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {hi ? "लाइव अनुमानित समय" : "live ETA"}
          </p>
        </div>
      </div>
      <div className="relative h-1 overflow-hidden bg-muted">
        <span className="absolute inset-y-0 w-1/3 bg-gradient-leaf animate-sweep" aria-hidden />
      </div>
      <div className="px-5 py-4">
        <p className="text-sm font-semibold text-navy">
          {boosted
            ? hi
              ? "जिला हस्तक्षेप लागू — काउंटर बढ़ाए गए, आपका इंतज़ार कम हुआ"
              : "District intervention applied — extra counters opened, your wait dropped"
            : hi
              ? "अपने स्लॉट से 10 मिनट पहले पहुँचें। कतार में जगह सुरक्षित है।"
              : "Reach 10 minutes before your slot. Your place in the queue is protected."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="rounded-xl bg-navy px-4 py-4 text-base font-bold text-primary-foreground focus-ring">
            🧭 {hi ? "रास्ता देखें" : "Directions"}
          </button>
          <button className="rounded-xl border border-border bg-card px-4 py-4 text-base font-bold text-navy focus-ring">
            🔔 {hi ? "बुलावा अलर्ट" : "Alert me"}
          </button>
        </div>
      </div>
    </section>
  );
}
