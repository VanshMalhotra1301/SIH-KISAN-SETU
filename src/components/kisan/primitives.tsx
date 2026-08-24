import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-leaf",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M3 17c4.5 0 6-3.5 9-3.5s4.5 3.5 9 3.5" strokeLinecap="round" className="text-primary-foreground" />
        <path d="M8 12.5c0-3.6 1.8-6.5 4-8.5 2.2 2 4 4.9 4 8.5" strokeLinecap="round" className="text-primary-foreground" />
      </svg>
    </span>
  );
}

export function Wordmark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-3 focus-ring rounded-xl">
      <BrandMark />
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-base font-extrabold tracking-tight",
            tone === "dark" ? "text-command-fg" : "text-navy",
          )}
        >
          KISAN SETU
        </span>
        <span
          className={cn(
            "block text-[10px] font-medium uppercase tracking-[0.18em]",
            tone === "dark" ? "text-command-muted" : "text-muted-foreground",
          )}
        >
          Procurement Intelligence
        </span>
      </span>
    </Link>
  );
}

export function PrototypeBadge({
  tone = "light",
  label = "Prototype Simulation",
  className,
}: {
  tone?: "light" | "dark";
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tone === "dark"
          ? "border-saffron/40 bg-saffron/10 text-saffron"
          : "border-saffron/40 bg-saffron-soft text-navy",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-saffron animate-blip" />
      {label}
    </span>
  );
}

export function SectionLabel({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.2em]",
        tone === "dark" ? "text-cyan-signal" : "text-leaf",
      )}
    >
      {children}
    </p>
  );
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  trend,
  tone = "light",
  accent = "navy",
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  trend?: { direction: "up" | "down"; text: string; good?: boolean };
  tone?: "light" | "dark";
  accent?: "navy" | "leaf" | "saffron" | "danger";
  className?: string;
}) {
  const accentBar = {
    navy: "bg-navy",
    leaf: "bg-leaf",
    saffron: "bg-saffron",
    danger: "bg-danger",
  }[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden p-4 transition-transform duration-300 hover:-translate-y-0.5 sm:p-5",
        tone === "dark" ? "panel-command" : "surface",
        className,
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-0.5", accentBar)} />
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.14em]",
          tone === "dark" ? "text-command-muted" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display text-2xl font-extrabold tabular-nums sm:text-3xl",
            tone === "dark" ? "text-command-fg" : "text-navy",
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className={cn("text-xs font-semibold", tone === "dark" ? "text-command-muted" : "text-muted-foreground")}>
            {unit}
          </span>
        ) : null}
      </p>
      {hint ? (
        <p className={cn("mt-1 text-xs", tone === "dark" ? "text-command-muted" : "text-muted-foreground")}>{hint}</p>
      ) : null}
      {trend ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            trend.good === false ? "bg-danger-soft text-danger" : "bg-leaf-soft text-leaf",
          )}
        >
          {trend.direction === "up" ? "▲" : "▼"} {trend.text}
        </p>
      ) : null}
    </div>
  );
}

export function CapacityBar({
  pct,
  tone = "light",
  showTicks = true,
}: {
  pct: number;
  tone?: "light" | "dark";
  showTicks?: boolean;
}) {
  const fill = pct >= 85 ? "bg-danger" : pct >= 65 ? "bg-saffron" : "bg-leaf";
  return (
    <div className="w-full">
      <div
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full",
          tone === "dark" ? "bg-command-line/60" : "bg-muted",
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", fill)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
        {showTicks ? (
          <span className="absolute inset-y-0 left-[85%] w-px bg-foreground/25" aria-hidden />
        ) : null}
      </div>
    </div>
  );
}

export function HealthDot({ health }: { health: "green" | "yellow" | "red" }) {
  const color = { green: "bg-leaf", yellow: "bg-saffron", red: "bg-danger" }[health];
  return (
    <span className="relative inline-flex size-2.5 items-center justify-center">
      <span className={cn("absolute inline-flex size-2.5 rounded-full animate-pulse-ring", color)} />
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "leaf" | "saffron" | "danger" | "navy";
}) {
  const styles = {
    muted: "bg-muted text-muted-foreground",
    leaf: "bg-leaf-soft text-leaf",
    saffron: "bg-saffron-soft text-navy",
    danger: "bg-danger-soft text-danger",
    navy: "bg-navy text-primary-foreground",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", styles)}>
      {children}
    </span>
  );
}
