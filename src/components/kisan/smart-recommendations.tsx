import { HealthDot, SectionLabel } from "./primitives";
import type { CentreSlotCandidate, RecommendationEngineResult } from "@/lib/kisan/recommendation-engine";
import { centreHealth } from "@/lib/kisan/store";
import { cn } from "@/lib/utils";

interface SmartRecommendationsProps {
  smartRecommendations: RecommendationEngineResult | null;
  top3: CentreSlotCandidate[];
  isHindi: boolean;
  onSelectOption: (candidate: CentreSlotCandidate) => void;
  className?: string;
}

export function SmartRecommendationsCard({
  smartRecommendations,
  top3,
  isHindi: hi,
  onSelectOption,
  className,
}: SmartRecommendationsProps) {
  if (!smartRecommendations || top3.length === 0) {
    return null;
  }

  const { adaptationContext } = smartRecommendations;

  return (
    <section className={cn("surface-lift p-5 sm:p-6 border-2 border-leaf/30 space-y-5 rounded-2xl relative overflow-hidden shadow-sm", className)}>
      {/* Background ambient accent */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 size-48 rounded-full bg-leaf/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-leaf text-white font-black text-xs shadow-sm">
              AI
            </span>
            <SectionLabel tone="light">
              {hi ? "स्मार्ट खरीद केंद्र एवं समय चयन" : "Smart Mandi & Time Slot Recommendation"}
            </SectionLabel>
          </div>
          <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
            {hi ? "आपके लिए सर्वश्रेष्ठ 3 खरीद केंद्र एवं समय विकल्प" : "Top 3 Best Mandi & Time Slot Options for You"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hi
              ? "गाँव से दूरी, न्यूनतम प्रतीक्षा और खाली मंडी के आधार पर सर्वश्रेष्ठ सुझाव।"
              : "Recommended based on distance from your village, shortest waiting queue, and active weighbridge scales."}
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex flex-wrap items-center gap-2">
          {adaptationContext.isHighLoad ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              {hi ? "⚡ भीड़ का समय: खाली मंडी का सुझाव" : "⚡ Busy Hours: Rerouting to empty mandis"}
            </span>
          ) : adaptationContext.isSimilarWait ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[11px] font-bold text-sky-800 dark:text-sky-300">
              <span className="size-2 rounded-full bg-sky-500" />
              {hi ? "📍 निकटतम मंडी: कम डीजल व यात्रा समय" : "📍 Nearest Mandi: Shortest travel distance"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf-soft px-3 py-1 text-[11px] font-bold text-navy">
              <span className="size-2 rounded-full bg-leaf" />
              {hi ? "✓ सर्वश्रेष्ठ विकल्प सक्रिय" : "✓ Best Options Live"}
            </span>
          )}
        </div>
      </div>

      {/* Top 3 Cards Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {top3.map((cand, idx) => {
          const isRank1 = idx === 0;
          const isRank2 = idx === 1;
          const health = centreHealth(cand.centre.capacityUsedPct);

          const rankBadge = isRank1
            ? { label: hi ? "⭐ सबसे सही विकल्प (#1)" : "⭐ BEST MATCH (#1)", bg: "bg-gradient-leaf text-white border-leaf" }
            : isRank2
            ? { label: hi ? "🥈 दूसरा विकल्प (#2)" : "🥈 2ND OPTION (#2)", bg: "bg-navy text-white border-navy" }
            : { label: hi ? "🥉 तीसरा विकल्प (#3)" : "🥉 3RD OPTION (#3)", bg: "bg-muted text-navy border-border" };

          return (
            <div
              key={cand.id}
              className={cn(
                "rounded-2xl border-2 p-5 transition-all duration-200 flex flex-col justify-between relative",
                isRank1
                  ? "border-leaf bg-leaf/5 shadow-md shadow-leaf/10 ring-1 ring-leaf/20"
                  : "border-border bg-card hover:border-leaf/40 hover:shadow-sm"
              )}
            >
              <div className="space-y-3.5">
                {/* Top Badge Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wide border shadow-xs", rankBadge.bg)}>
                    {rankBadge.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <HealthDot health={health} />
                  </div>
                </div>

                {/* Centre Name & Recommended Time Slot */}
                <div>
                  <h3 className="font-display text-base font-extrabold text-navy leading-snug">
                    {cand.centre.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cand.centre.nameHi} · {cand.centre.district}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-leaf-soft/70 px-3 py-1 text-xs font-bold text-navy border border-leaf/30">
                    <span>🕒 {cand.slotWindow}</span>
                    <span className="text-muted-foreground font-normal">({cand.slotDate === "Today" ? (hi ? "आज" : "Today") : (hi ? "कल" : "Tomorrow")})</span>
                  </div>
                </div>


                {/* 4 Simple Farmer-Friendly Metric Pills */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                  <div className="rounded-xl bg-muted/60 p-2.5 border border-border/70">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                      {hi ? "प्रतीक्षा समय" : "Waiting Time"}
                    </span>
                    <p className="font-extrabold text-navy text-sm mt-0.5">
                      {cand.rawMetrics.predictedWaitMin === 0
                        ? (hi ? "0 मिनट (तुरंत)" : "0 min (Immediate)")
                        : `${cand.rawMetrics.predictedWaitMin} ${hi ? "मिनट" : "min"}`}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/60 p-2.5 border border-border/70">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                      {hi ? "गाँव से दूरी" : "Distance"}
                    </span>
                    <p className="font-extrabold text-navy text-sm mt-0.5">{cand.rawMetrics.distanceKm} km</p>
                  </div>

                  <div className="rounded-xl bg-muted/60 p-2.5 border border-border/70">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                      {hi ? "मंडी में भीड़" : "Yard Crowd"}
                    </span>
                    <p className="font-extrabold text-navy text-xs mt-1">
                      {cand.rawMetrics.queueLoad <= 1
                        ? (hi ? "भीड़ नहीं है" : "No crowd")
                        : `${cand.rawMetrics.queueLoad} ${hi ? "ट्रैक्टर कतार में" : "tractors ahead"}`}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/60 p-2.5 border border-border/70">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                      {hi ? "तुलाई कांटे" : "Open Scales"}
                    </span>
                    <p className="font-extrabold text-navy text-xs mt-1">
                      {cand.rawMetrics.activeCounters} {hi ? "कांटे चालू" : "open scales"}
                    </p>
                  </div>
                </div>

                {/* Simple Live / Estimated Note */}
                <p className="text-[11px] text-muted-foreground text-center pt-0.5">
                  {cand.isEstimated
                    ? (hi ? "⏱️ अनुमानित समय (कांटों की क्षमता अनुसार)" : "⏱️ Estimated time (based on open scales)")
                    : (hi ? "✓ आज की लाइव तुलाई के अनुसार" : "✓ Based on live scale throughput today")}
                </p>
              </div>

              {/* Direct Booking Button */}
              <div className="pt-4 mt-auto">
                <button
                  type="button"
                  onClick={() => onSelectOption(cand)}
                  className={cn(
                    "w-full rounded-xl py-3 px-4 text-xs font-bold transition-all focus-ring shadow-sm flex items-center justify-center gap-1.5",
                    isRank1
                      ? "bg-gradient-leaf text-white shadow-leaf/25 hover:scale-[1.02]"
                      : "bg-navy text-white hover:bg-navy/90"
                  )}
                >
                  <span>{hi ? `✓ यह समय स्लॉट चुनें (${cand.slotWindow}) →` : `✓ Book Slot for ${cand.slotWindow} →`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
