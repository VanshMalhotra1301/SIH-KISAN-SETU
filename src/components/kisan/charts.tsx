import type { ForecastPoint, ThroughputPoint, WaitAnalyticsPoint } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

/** Lightweight, dependency-free SVG charts tuned for the KISAN SETU look. */

function path(points: Array<{ x: number; y: number }>) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export function ForecastChart({
  data,
  tone = "dark",
  className,
}: {
  data: ForecastPoint[];
  tone?: "light" | "dark";
  className?: string;
}) {
  const w = 640;
  const h = 220;
  const pad = { top: 16, right: 16, bottom: 26, left: 30 };
  const max = Math.max(...data.map((d) => Math.max(d.queue, d.predicted, d.capacityLine))) * 1.15;
  const px = (i: number) => pad.left + (i * (w - pad.left - pad.right)) / (data.length - 1);
  const py = (v: number) => h - pad.bottom - (v / max) * (h - pad.top - pad.bottom);

  const actual = data.map((d, i) => ({ x: px(i), y: py(d.queue) }));
  const predicted = data.map((d, i) => ({ x: px(i), y: py(d.predicted) }));
  const capY = py(data[0]!.capacityLine);
  const gridColor = tone === "dark" ? "var(--command-line)" : "var(--border)";
  const axisText = tone === "dark" ? "var(--command-muted)" : "var(--muted-foreground)";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", className)} role="img" aria-label="Queue forecast">
      <defs>
        <linearGradient id="ks-forecast-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan-signal)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--cyan-signal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad.left}
          x2={w - pad.right}
          y1={pad.top + f * (h - pad.top - pad.bottom)}
          y2={pad.top + f * (h - pad.top - pad.bottom)}
          stroke={gridColor}
          strokeWidth="1"
        />
      ))}
      <line x1={pad.left} x2={w - pad.right} y1={capY} y2={capY} stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="6 5" />
      <text x={w - pad.right} y={capY - 6} textAnchor="end" fontSize="10" fill="var(--danger)" fontWeight="700">
        SAFE CAPACITY
      </text>
      <path d={`${path(predicted)} L${px(data.length - 1)},${h - pad.bottom} L${pad.left},${h - pad.bottom} Z`} fill="url(#ks-forecast-fill)" />
      <path d={path(predicted)} fill="none" stroke="var(--cyan-signal)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
      <path d={path(actual)} fill="none" stroke="var(--leaf)" strokeWidth="2.5" strokeLinecap="round" />
      {predicted.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.6" fill="var(--cyan-signal)" />
      ))}
      {data.map((d, i) => (
        <text key={d.label} x={px(i)} y={h - 8} textAnchor="middle" fontSize="10" fill={axisText}>
          {d.label}
        </text>
      ))}
    </svg>
  );
}

export function WaitAnalyticsChart({
  data,
  tone = "dark",
}: {
  data: WaitAnalyticsPoint[];
  tone?: "light" | "dark";
}) {
  const w = 560;
  const h = 200;
  const pad = { top: 14, bottom: 26, left: 26, right: 10 };
  const max = Math.max(...data.map((d) => d.beforeMin)) * 1.12;
  const band = (w - pad.left - pad.right) / data.length;
  const barW = band / 2 - 6;
  const axisText = tone === "dark" ? "var(--command-muted)" : "var(--muted-foreground)";
  const scale = (v: number) => (v / max) * (h - pad.top - pad.bottom);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Waiting time analytics">
      {data.map((d, i) => {
        const x = pad.left + i * band + 6;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={h - pad.bottom - scale(d.beforeMin)}
              width={barW}
              height={scale(d.beforeMin)}
              rx="3"
              fill="var(--command-line)"
            />
            <rect
              x={x + barW + 5}
              y={h - pad.bottom - scale(d.afterMin)}
              width={barW}
              height={scale(d.afterMin)}
              rx="3"
              fill="var(--leaf)"
            />
            <text x={x + barW} y={h - 8} textAnchor="middle" fontSize="10" fill={axisText}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ThroughputChart({ data }: { data: ThroughputPoint[] }) {
  const w = 560;
  const h = 190;
  const pad = { top: 16, bottom: 24, left: 20, right: 10 };
  const max = Math.max(...data.map((d) => d.quintals)) * 1.15;
  const px = (i: number) => pad.left + (i * (w - pad.left - pad.right)) / (data.length - 1);
  const py = (v: number) => h - pad.bottom - (v / max) * (h - pad.top - pad.bottom);
  const pts = data.map((d, i) => ({ x: px(i), y: py(d.quintals) }));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Throughput per hour">
      <defs>
        <linearGradient id="ks-throughput" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--saffron)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--saffron)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path(pts)} L${px(data.length - 1)},${h - pad.bottom} L${pad.left},${h - pad.bottom} Z`} fill="url(#ks-throughput)" />
      <path d={path(pts)} fill="none" stroke="var(--saffron)" strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--saffron)" />
      ))}
      {data.map((d, i) => (
        <text key={d.label} x={px(i)} y={h - 7} textAnchor="middle" fontSize="10" fill="var(--command-muted)">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

export function RadialGauge({
  pct,
  label,
  size = 108,
  tone = "dark",
}: {
  pct: number;
  label: string;
  size?: number;
  tone?: "light" | "dark";
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const stroke = pct >= 85 ? "var(--danger)" : pct >= 65 ? "var(--saffron)" : "var(--leaf)";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label} ${pct}%`}>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" stroke={tone === "dark" ? "var(--command-line)" : "var(--muted)"} />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="9"
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, pct) / 100)}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.22,1,0.36,1)" }}
        />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fontSize="20"
          fontWeight="800"
          fill={tone === "dark" ? "var(--command-fg)" : "var(--navy)"}
        >
          {pct}%
        </text>
      </svg>
      <span className={cn("text-[11px] font-semibold", tone === "dark" ? "text-command-muted" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}
