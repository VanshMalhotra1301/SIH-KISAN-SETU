import { useState } from "react";

import { CapacityBar, HealthDot, Pill } from "@/components/kisan/primitives";
import { centreHealth } from "@/lib/kisan/store";
import type { ProcurementCentre } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

const healthFill = { green: "var(--leaf)", yellow: "var(--saffron)", red: "var(--danger)" } as const;

export function DistrictMap({
  centres,
  district,
  tone = "light",
}: {
  centres: ProcurementCentre[];
  district?: string;
  tone?: "light" | "dark";
}) {
  const [selectedId, setSelectedId] = useState(centres[0]?.id ?? "");
  const selected = centres.find((c) => c.id === selectedId) ?? centres[0];

  const districtLabel = district || "District";

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div
        className={cn(
          "relative overflow-hidden p-3 sm:p-4",
          tone === "dark" ? "panel-command" : "surface-lift",
        )}
      >
        <div className="absolute inset-0 grid-lines opacity-40" aria-hidden />
        <div className="relative flex items-center justify-between px-1 pb-3">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.18em]",
              tone === "dark" ? "text-cyan-signal" : "text-leaf",
            )}
          >
            {districtLabel} · live centre health
          </p>
          <div
            className={cn(
              "hidden gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] sm:flex",
              tone === "dark" ? "text-command-muted" : "text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-leaf" /> Normal
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-saffron" /> Strained
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-danger" /> Overload
            </span>
          </div>
        </div>

        <svg viewBox="0 0 100 92" className="relative w-full" role="img" aria-label="District procurement centre map">
          <path
            d="M8 12 L44 6 L78 14 L92 40 L84 74 L52 88 L18 80 L6 48 Z"
            fill={
              tone === "dark"
                ? "color-mix(in oklab, var(--cyan-signal) 6%, transparent)"
                : "color-mix(in oklab, var(--leaf) 7%, transparent)"
            }
            stroke={
              tone === "dark"
                ? "color-mix(in oklab, var(--cyan-signal) 45%, transparent)"
                : "color-mix(in oklab, var(--leaf) 35%, transparent)"
            }
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
                  stroke={
                    tone === "dark"
                      ? "color-mix(in oklab, var(--command-line) 90%, transparent)"
                      : "color-mix(in oklab, var(--border) 90%, transparent)"
                  }
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
                  stroke={tone === "dark" ? "var(--command)" : "var(--card)"}
                  strokeWidth="0.6"
                />
                <text
                  x={c.map.x}
                  y={c.map.y - 5.6}
                  textAnchor="middle"
                  fontSize="3.1"
                  fontWeight="800"
                  fill={
                    active
                      ? tone === "dark"
                        ? "var(--command-fg)"
                        : "var(--navy)"
                      : tone === "dark"
                      ? "var(--command-muted)"
                      : "var(--muted-foreground)"
                  }
                >
                  {c.code} · {c.capacityUsedPct}%
                </text>
                <text
                  x={c.map.x}
                  y={c.map.y + 7}
                  textAnchor="middle"
                  fontSize="2.5"
                  fill={tone === "dark" ? "var(--command-muted)" : "var(--muted-foreground)"}
                >
                  Q{c.queueLength}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selected ? (
        <div
          className={cn(
            "flex flex-col gap-4 p-5",
            tone === "dark" ? "panel-command" : "surface-lift",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.16em]",
                  tone === "dark" ? "text-command-muted" : "text-muted-foreground",
                )}
              >
                Selected centre
              </p>
              <h3
                className={cn(
                  "mt-1 font-display text-lg font-extrabold",
                  tone === "dark" ? "text-command-fg" : "text-navy",
                )}
              >
                {selected.name}
              </h3>
            </div>
            <HealthDot health={centreHealth(selected.capacityUsedPct)} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Queue" value={String(selected.queueLength)} tone={tone} />
            <Metric label="Predicted wait" value={`${selected.predictedWaitMin} min`} tone={tone} />
            <Metric label="Farmers today" value={String(selected.farmersToday)} tone={tone} />
            <Metric label="Counters" value={`${selected.activeCounters}/${selected.totalCounters}`} tone={tone} />
          </div>

          <div>
            <div
              className={cn(
                "mb-2 flex items-center justify-between text-xs font-semibold",
                tone === "dark" ? "text-command-muted" : "text-muted-foreground",
              )}
            >
              <span>Capacity used</span>
              <span className={cn("tabular-nums font-bold", tone === "dark" ? "text-command-fg" : "text-navy")}>
                {selected.capacityUsedPct}%
              </span>
            </div>
            <CapacityBar pct={selected.capacityUsedPct} tone={tone} />
            <p
              className={cn(
                "mt-2 text-xs",
                tone === "dark" ? "text-command-muted" : "text-muted-foreground",
              )}
            >
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

function Metric({ label, value, tone = "light" }: { label: string; value: string; tone?: "light" | "dark" }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        tone === "dark"
          ? "border-command-line/70 bg-command-panel/40"
          : "border-border bg-muted/40",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.12em]",
          tone === "dark" ? "text-command-muted" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-display text-base font-bold tabular-nums",
          tone === "dark" ? "text-command-fg" : "text-navy",
        )}
      >
        {value}
      </p>
    </div>
  );
}
