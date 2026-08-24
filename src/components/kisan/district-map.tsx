import { useState } from "react";

import { CapacityBar, HealthDot, Pill } from "@/components/kisan/primitives";
import { centreHealth } from "@/lib/kisan/store";
import type { ProcurementCentre } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

const healthFill = { green: "var(--leaf)", yellow: "var(--saffron)", red: "var(--danger)" } as const;

export function DistrictMap({ centres }: { centres: ProcurementCentre[] }) {
  const [selectedId, setSelectedId] = useState(centres[0]?.id ?? "");
  const selected = centres.find((c) => c.id === selectedId) ?? centres[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="panel-command relative overflow-hidden p-3 sm:p-4">
        <div className="absolute inset-0 grid-lines opacity-40" aria-hidden />
        <div className="relative flex items-center justify-between px-1 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-signal">
            Karnal district · live centre health
          </p>
          <div className="hidden gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-command-muted sm:flex">
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-leaf" /> Normal</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-saffron" /> Strained</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-danger" /> Overload</span>
          </div>
        </div>

        <svg viewBox="0 0 100 92" className="relative w-full" role="img" aria-label="District procurement centre map">
          <path
            d="M8 12 L44 6 L78 14 L92 40 L84 74 L52 88 L18 80 L6 48 Z"
            fill="color-mix(in oklab, var(--cyan-signal) 6%, transparent)"
            stroke="color-mix(in oklab, var(--cyan-signal) 45%, transparent)"
            strokeWidth="0.5"
            strokeDasharray="2 1.5"
          />
          {centres.map((c) =>
            centres
              .filter((o) => o.id !== c.id)
              .slice(0, 1)
              .map((o) => (
                <line
                  key={`${c.id}-${o.id}`}
                  x1={c.map.x}
                  y1={c.map.y}
                  x2={o.map.x}
                  y2={o.map.y}
                  stroke="color-mix(in oklab, var(--command-line) 90%, transparent)"
                  strokeWidth="0.35"
                />
              )),
          )}
          {centres.map((c) => {
            const health = centreHealth(c.capacityUsedPct);
            const active = c.id === selectedId;
            return (
              <g
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${c.name}, ${c.capacityUsedPct}% capacity`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedId(c.id);
                }}
              >
                <circle cx={c.map.x} cy={c.map.y} r={active ? 7 : 5.4} fill={healthFill[health]} opacity="0.16" />
                <circle
                  cx={c.map.x}
                  cy={c.map.y}
                  r={health === "red" ? 4.4 : 3.6}
                  fill={healthFill[health]}
                  opacity={health === "red" ? 0.32 : 0.22}
                  className={health === "red" ? "animate-blip" : undefined}
                />
                <circle
                  cx={c.map.x}
                  cy={c.map.y}
                  r="2.1"
                  fill={healthFill[health]}
                  stroke="var(--command)"
                  strokeWidth="0.6"
                />
                <text
                  x={c.map.x}
                  y={c.map.y - 5.6}
                  textAnchor="middle"
                  fontSize="3.1"
                  fontWeight="800"
                  fill={active ? "var(--command-fg)" : "var(--command-muted)"}
                >
                  {c.code} · {c.capacityUsedPct}%
                </text>
                <text
                  x={c.map.x}
                  y={c.map.y + 7}
                  textAnchor="middle"
                  fontSize="2.5"
                  fill="var(--command-muted)"
                >
                  Q{c.queueLength}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selected ? (
        <div className="panel-command flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-command-muted">
                Selected centre
              </p>
              <h3 className="mt-1 font-display text-lg font-extrabold text-command-fg">{selected.name}</h3>
            </div>
            <HealthDot health={centreHealth(selected.capacityUsedPct)} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Queue" value={String(selected.queueLength)} />
            <Metric label="Predicted wait" value={`${selected.predictedWaitMin} min`} />
            <Metric label="Farmers today" value={String(selected.farmersToday)} />
            <Metric label="Counters" value={`${selected.activeCounters}/${selected.totalCounters}`} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-command-muted">
              <span>Capacity used</span>
              <span className="tabular-nums text-command-fg">{selected.capacityUsedPct}%</span>
            </div>
            <CapacityBar pct={selected.capacityUsedPct} tone="dark" />
            <p className="mt-2 text-xs text-command-muted">
              {selected.procuredTodayQuintals.toLocaleString("en-IN")} /{" "}
              {selected.dailyCapacityQuintals.toLocaleString("en-IN")} quintals procured
            </p>
          </div>

          <div className="mt-auto flex flex-wrap gap-2">
            <Pill tone={centreHealth(selected.capacityUsedPct) === "red" ? "danger" : "leaf"}>
              {centreHealth(selected.capacityUsedPct) === "red" ? "Intervention needed" : "Within safe band"}
            </Pill>
            <Pill tone="muted">{selected.processingRatePerHour}/hr processing</Pill>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("rounded-lg border border-command-line/70 px-3 py-2")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-command-muted">{label}</p>
      <p className="font-display text-base font-bold tabular-nums text-command-fg">{value}</p>
    </div>
  );
}
