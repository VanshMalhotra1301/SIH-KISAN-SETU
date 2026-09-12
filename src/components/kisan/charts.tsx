import { useState, useRef, useCallback, useEffect } from "react";
import type { ForecastPoint, ThroughputPoint, WaitAnalyticsPoint } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

/**
 * KISAN SETU — Rich, Explainable, Interactive SVG Charts
 * ─────────────────────────────────────────────────────
 * Features:
 * • Smooth cubic-Bézier curves instead of jagged straight lines
 * • Animated "Now" time marker with pulsing dot
 * • Interactive hover tooltips with data values
 * • Danger zone shading above capacity line
 * • Auto-labeled data points with values at peaks
 * • Built-in legends & Y-axis scale labels
 * • Peak & minimum annotations with callout badges
 * • Real-time CSS animation on mount
 */

/* ─── Smooth Bézier Curve Helper ─── */

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  const tension = 0.3;
  const first = points[0]!;
  let d = `M${first.x.toFixed(2)},${first.y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

function linearPath(points: Array<{ x: number; y: number }>): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/* ─── Chart CSS (injected once) ─── */

const CHART_CSS_ID = "ks-chart-styles";

function ensureChartStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CHART_CSS_ID)) return;
  const style = document.createElement("style");
  style.id = CHART_CSS_ID;
  style.textContent = `
    @keyframes ks-pulse-ring {
      0% { r: 4; opacity: 1; }
      70% { r: 12; opacity: 0; }
      100% { r: 12; opacity: 0; }
    }
    @keyframes ks-dash-march {
      to { stroke-dashoffset: -12; }
    }
    @keyframes ks-fade-in-up {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ks-line-draw {
      from { stroke-dashoffset: 2000; }
      to { stroke-dashoffset: 0; }
    }
    .ks-pulse-ring {
      animation: ks-pulse-ring 2s cubic-bezier(0.22,1,0.36,1) infinite;
    }
    .ks-dash-march {
      animation: ks-dash-march 0.6s linear infinite;
    }
    .ks-chart-enter {
      animation: ks-fade-in-up 0.5s ease-out both;
    }
    .ks-line-draw {
      stroke-dasharray: 2000;
      animation: ks-line-draw 1.2s ease-out forwards;
    }
    .ks-tooltip-group { pointer-events: none; }
  `;
  document.head.appendChild(style);
}

/* ════════════════════════════════════════════════════════════════
   1. FORECAST CHART — Actual vs Predicted Queue with Full Annotations
   ════════════════════════════════════════════════════════════════ */

export function ForecastChart({
  data,
  tone = "dark",
  className,
}: {
  data: ForecastPoint[];
  tone?: "light" | "dark";
  className?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { ensureChartStyles(); }, []);

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[280px] w-full items-center justify-center rounded-xl border p-4 text-xs font-semibold",
          tone === "dark"
            ? "border-command-line bg-command-panel/40 text-command-muted"
            : "border-border bg-muted/30 text-muted-foreground",
          className,
        )}
      >
        <span>No queue forecast data available for this centre.</span>
      </div>
    );
  }

  const w = 700;
  const h = 320;
  const pad = { top: 42, right: 50, bottom: 70, left: 52 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const allValues = data.flatMap((d) => [d.queue ?? 0, d.predicted ?? 0, d.capacityLine ?? 0]);
  const maxVal = Math.max(1, ...allValues) * 1.2;
  const px = (i: number) => pad.left + (i * chartW) / Math.max(1, data.length - 1);
  const py = (v: number) => pad.top + chartH - (v / maxVal) * chartH;

  const actual = data.map((d, i) => ({ x: px(i), y: py(d.queue ?? 0) }));
  const predicted = data.map((d, i) => ({ x: px(i), y: py(d.predicted ?? 0) }));
  const capY = py(data[0]?.capacityLine ?? 35);
  const capVal = data[0]?.capacityLine ?? 35;

  // Find peak, min, and "now" (current hour match)
  const peakIdx = data.reduce((pi, d, i) => (d.queue > (data[pi]?.queue ?? 0) ? i : pi), 0);
  const minIdx = data.reduce((mi, d, i) => (d.queue < (data[mi]?.queue ?? Infinity) ? i : mi), 0);

  // Determine "now" index based on current hour
  const nowHour = new Date().getHours();
  const nowStr = `${nowHour.toString().padStart(2, "0")}:00`;
  const nowIdx = data.findIndex((d) => d.label === nowStr);

  // Y-axis tick values
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxVal * i) / yTicks));

  const isDark = tone === "dark";
  const gridColor = isDark ? "var(--command-line)" : "oklch(0.92 0.008 250)";
  const axisText = isDark ? "var(--command-muted)" : "var(--muted-foreground)";
  const bgPanel = isDark ? "var(--command-panel)" : "white";

  // Danger zone fill path (above capacity)
  const dangerClipPath = `M${pad.left},${capY} L${pad.left + chartW},${capY} L${pad.left + chartW},${pad.top} L${pad.left},${pad.top} Z`;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * w;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < data.length; i++) {
        const dist = Math.abs(px(i) - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      setHoveredIdx(closest);
    },
    [data.length, w],
  );

  const hd = hoveredIdx !== null ? data[hoveredIdx] : null;
  const hx = hoveredIdx !== null ? px(hoveredIdx) : 0;

  return (
    <div className={cn("ks-chart-enter relative", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full select-none"
        role="img"
        aria-label="Queue forecast — Actual vs Predicted with capacity threshold"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          {/* Actual line gradient fill */}
          <linearGradient id="ks-fc-actual-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--leaf)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--leaf)" stopOpacity="0.02" />
          </linearGradient>
          {/* Predicted line gradient fill */}
          <linearGradient id="ks-fc-pred-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cyan-signal)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--cyan-signal)" stopOpacity="0.01" />
          </linearGradient>
          {/* Danger zone gradient */}
          <linearGradient id="ks-fc-danger-zone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.03" />
          </linearGradient>
          {/* Tooltip background filter */}
          <filter id="ks-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
          {/* Clip for danger zone */}
          <clipPath id="ks-clip-danger">
            <path d={dangerClipPath} />
          </clipPath>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={w} height={h} fill={bgPanel} rx="16" />

        {/* Horizontal grid lines + Y-axis labels */}
        {yTickValues.map((val) => {
          const yPos = py(val);
          return (
            <g key={`y-${val}`}>
              <line
                x1={pad.left}
                x2={pad.left + chartW}
                y1={yPos}
                y2={yPos}
                stroke={gridColor}
                strokeWidth="0.8"
              />
              <text
                x={pad.left - 8}
                y={yPos + 3.5}
                textAnchor="end"
                fontSize="10"
                fontWeight="600"
                fill={axisText}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Vertical grid lines */}
        {data.map((_, i) => (
          <line
            key={`vg-${i}`}
            x1={px(i)}
            x2={px(i)}
            y1={pad.top}
            y2={pad.top + chartH}
            stroke={gridColor}
            strokeWidth="0.5"
            strokeDasharray="3 4"
            opacity="0.5"
          />
        ))}

        {/* ── DANGER ZONE SHADING (above capacity line) ── */}
        <rect
          x={pad.left}
          y={pad.top}
          width={chartW}
          height={capY - pad.top}
          fill="url(#ks-fc-danger-zone)"
          rx="0"
        />
        <text
          x={pad.left + 8}
          y={pad.top + 14}
          fontSize="9"
          fontWeight="700"
          fill="var(--danger)"
          opacity="0.65"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.08em"
        >
          ⚠ OVERLOAD ZONE
        </text>

        {/* ── CAPACITY LINE ── */}
        <line
          x1={pad.left}
          x2={pad.left + chartW}
          y1={capY}
          y2={capY}
          stroke="var(--danger)"
          strokeWidth="1.8"
          strokeDasharray="8 5"
          className="ks-dash-march"
        />
        <rect
          x={pad.left + chartW - 112}
          y={capY - 18}
          width="112"
          height="18"
          rx="4"
          fill="var(--danger)"
          opacity="0.12"
        />
        <text
          x={pad.left + chartW - 56}
          y={capY - 6}
          textAnchor="middle"
          fontSize="9.5"
          fill="var(--danger)"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.06em"
        >
          SAFE CAPACITY ({capVal})
        </text>

        {/* ── PREDICTED AREA FILL ── */}
        <path
          d={`${smoothPath(predicted)} L${px(data.length - 1)},${pad.top + chartH} L${pad.left},${pad.top + chartH} Z`}
          fill="url(#ks-fc-pred-fill)"
        />

        {/* ── ACTUAL AREA FILL ── */}
        <path
          d={`${smoothPath(actual)} L${px(data.length - 1)},${pad.top + chartH} L${pad.left},${pad.top + chartH} Z`}
          fill="url(#ks-fc-actual-fill)"
        />

        {/* ── PREDICTED LINE (dashed, smooth) ── */}
        <path
          d={smoothPath(predicted)}
          fill="none"
          stroke="var(--cyan-signal)"
          strokeWidth="2.2"
          strokeDasharray="6 4"
          strokeLinecap="round"
          className="ks-line-draw"
        />

        {/* ── ACTUAL LINE (solid, smooth, thick) ── */}
        <path
          d={smoothPath(actual)}
          fill="none"
          stroke="var(--leaf)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ks-line-draw"
        />

        {/* ── DATA POINT DOTS ── */}
        {actual.map((p, i) => (
          <circle
            key={`ad-${i}`}
            cx={p.x}
            cy={p.y}
            r={i === peakIdx || i === minIdx || i === nowIdx ? 5 : 3.5}
            fill="var(--leaf)"
            stroke="white"
            strokeWidth="2"
            style={{ transition: "r 0.2s ease" }}
          />
        ))}
        {predicted.map((p, i) => (
          <circle
            key={`pd-${i}`}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--cyan-signal)"
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* ── PEAK ANNOTATION BADGE ── */}
        {(() => {
          const peakPt = actual[peakIdx];
          if (!peakPt) return null;
          const peakVal = data[peakIdx]?.queue ?? 0;
          const aboveCap = peakVal >= capVal;
          const badgeY = peakPt.y - 28;
          return (
            <g>
              <rect
                x={peakPt.x - 34}
                y={badgeY - 10}
                width="68"
                height="21"
                rx="6"
                fill={aboveCap ? "var(--danger)" : "var(--saffron)"}
                opacity="0.92"
                filter="url(#ks-shadow)"
              />
              <text
                x={peakPt.x}
                y={badgeY + 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fill="white"
                fontFamily="Inter, system-ui, sans-serif"
              >
                ▲ PEAK: {peakVal}
              </text>
              {/* Connector line */}
              <line
                x1={peakPt.x}
                y1={badgeY + 11}
                x2={peakPt.x}
                y2={peakPt.y - 6}
                stroke={aboveCap ? "var(--danger)" : "var(--saffron)"}
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          );
        })()}

        {/* ── MINIMUM ANNOTATION BADGE ── */}
        {minIdx !== peakIdx && (() => {
          const minPt = actual[minIdx];
          if (!minPt) return null;
          const minVal = data[minIdx]?.queue ?? 0;
          const badgeY = minPt.y + 20;
          return (
            <g>
              <rect
                x={minPt.x - 30}
                y={badgeY - 1}
                width="60"
                height="18"
                rx="5"
                fill="var(--leaf)"
                opacity="0.85"
                filter="url(#ks-shadow)"
              />
              <text
                x={minPt.x}
                y={badgeY + 12}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="white"
                fontFamily="Inter, system-ui, sans-serif"
              >
                ▼ LOW: {minVal}
              </text>
            </g>
          );
        })()}

        {/* ── "NOW" TIME MARKER ── */}
        {nowIdx >= 0 && nowIdx < data.length && (
          <g>
            <line
              x1={px(nowIdx)}
              x2={px(nowIdx)}
              y1={pad.top}
              y2={pad.top + chartH}
              stroke="var(--navy)"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              opacity="0.7"
            />
            {/* Pulsing ring */}
            <circle
              cx={px(nowIdx)}
              cy={actual[nowIdx]?.y ?? 0}
              r="4"
              fill="none"
              stroke="var(--navy)"
              strokeWidth="2"
              opacity="0.6"
              className="ks-pulse-ring"
            />
            {/* NOW label */}
            <rect
              x={px(nowIdx) - 17}
              y={pad.top - 6}
              width="34"
              height="14"
              rx="4"
              fill="var(--navy)"
            />
            <text
              x={px(nowIdx)}
              y={pad.top + 5}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="800"
              fill="white"
              fontFamily="Inter, system-ui, sans-serif"
              letterSpacing="0.1em"
            >
              NOW
            </text>
          </g>
        )}

        {/* ── HOVER CROSSHAIR + TOOLTIP ── */}
        {hoveredIdx !== null && hd && (
          <g className="ks-tooltip-group">
            {/* Vertical crosshair line */}
            <line
              x1={hx}
              x2={hx}
              y1={pad.top}
              y2={pad.top + chartH}
              stroke={isDark ? "var(--command-fg)" : "var(--navy)"}
              strokeWidth="1"
              opacity="0.3"
            />
            {/* Highlight dots */}
            <circle cx={hx} cy={actual[hoveredIdx]?.y ?? 0} r="6" fill="var(--leaf)" stroke="white" strokeWidth="2.5" />
            <circle cx={hx} cy={predicted[hoveredIdx]?.y ?? 0} r="5" fill="var(--cyan-signal)" stroke="white" strokeWidth="2" />

            {/* Tooltip card */}
            {(() => {
              const ttW = 152;
              const ttH = 72;
              let ttX = hx + 14;
              if (ttX + ttW > w - 10) ttX = hx - ttW - 14;
              const ttY = Math.max(pad.top + 4, Math.min((actual[hoveredIdx]?.y ?? 0) - ttH / 2, h - pad.bottom - ttH - 4));
              const diff = (hd.queue ?? 0) - (hd.predicted ?? 0);
              const diffText = diff > 0 ? `+${diff} above` : diff < 0 ? `${diff} below` : "= matched";
              const diffColor = diff > 0 ? "var(--danger)" : diff < 0 ? "var(--leaf)" : axisText;
              return (
                <g>
                  <rect
                    x={ttX}
                    y={ttY}
                    width={ttW}
                    height={ttH}
                    rx="10"
                    fill={isDark ? "var(--command)" : "white"}
                    stroke={isDark ? "var(--command-line)" : "var(--border)"}
                    strokeWidth="1.5"
                    filter="url(#ks-shadow)"
                  />
                  <text x={ttX + 12} y={ttY + 16} fontSize="11" fontWeight="800" fill={isDark ? "var(--command-fg)" : "var(--navy)"} fontFamily="Inter, system-ui, sans-serif">
                    🕐 {hd.label}
                  </text>
                  <line x1={ttX + 10} x2={ttX + ttW - 10} y1={ttY + 22} y2={ttY + 22} stroke={gridColor} strokeWidth="0.8" />
                  <circle cx={ttX + 16} cy={ttY + 34} r="4" fill="var(--leaf)" />
                  <text x={ttX + 25} y={ttY + 38} fontSize="10.5" fontWeight="600" fill={isDark ? "var(--command-fg)" : "var(--foreground)"} fontFamily="Inter, system-ui, sans-serif">
                    Actual: {hd.queue ?? 0} tractors
                  </text>
                  <circle cx={ttX + 16} cy={ttY + 50} r="4" fill="var(--cyan-signal)" />
                  <text x={ttX + 25} y={ttY + 54} fontSize="10.5" fontWeight="600" fill={isDark ? "var(--command-fg)" : "var(--foreground)"} fontFamily="Inter, system-ui, sans-serif">
                    Predicted: {hd.predicted ?? 0} tractors
                  </text>
                  <text x={ttX + 12} y={ttY + 67} fontSize="9.5" fontWeight="700" fill={diffColor} fontFamily="Inter, system-ui, sans-serif">
                    Δ {diffText} prediction
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* ── X-AXIS LABELS ── */}
        {data.map((d, i) => (
          <text
            key={d.label}
            x={px(i)}
            y={pad.top + chartH + 18}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight={i === nowIdx ? "800" : "600"}
            fill={i === nowIdx ? (isDark ? "var(--command-fg)" : "var(--navy)") : axisText}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {d.label}
          </text>
        ))}

        {/* ── Y-AXIS TITLE ── */}
        <text
          x={14}
          y={pad.top + chartH / 2}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill={axisText}
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.08em"
          transform={`rotate(-90, 14, ${pad.top + chartH / 2})`}
        >
          TRACTORS IN QUEUE
        </text>

        {/* ── BUILT-IN LEGEND ── */}
        <g transform={`translate(${pad.left}, ${h - 16})`}>
          {/* Actual */}
          <circle cx="6" cy="-2" r="4.5" fill="var(--leaf)" />
          <text x="15" y="2" fontSize="10" fontWeight="700" fill={isDark ? "var(--command-fg)" : "var(--foreground)"} fontFamily="Inter, system-ui, sans-serif">
            Actual Queue
          </text>
          {/* Predicted */}
          <circle cx="112" cy="-2" r="4.5" fill="var(--cyan-signal)" />
          <line x1="103" x2="120" y1="-2" y2="-2" stroke="var(--cyan-signal)" strokeWidth="2" strokeDasharray="4 3" />
          <text x="126" y="2" fontSize="10" fontWeight="700" fill={isDark ? "var(--command-fg)" : "var(--foreground)"} fontFamily="Inter, system-ui, sans-serif">
            AI Predicted
          </text>
          {/* Capacity */}
          <line x1="220" x2="240" y1="-2" y2="-2" stroke="var(--danger)" strokeWidth="2" strokeDasharray="6 4" />
          <text x="246" y="2" fontSize="10" fontWeight="700" fill="var(--danger)" fontFamily="Inter, system-ui, sans-serif">
            Safe Capacity ({capVal})
          </text>
          {/* Peak */}
          <rect x="380" y="-9" width="10" height="10" rx="2" fill="var(--saffron)" opacity="0.85" />
          <text x="395" y="2" fontSize="10" fontWeight="700" fill={isDark ? "var(--command-fg)" : "var(--foreground)"} fontFamily="Inter, system-ui, sans-serif">
            Peak / Low Markers
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   2. WAIT ANALYTICS CHART — Before vs After with Improvement Labels
   ════════════════════════════════════════════════════════════════ */

export function WaitAnalyticsChart({
  data,
  tone = "dark",
}: {
  data: WaitAnalyticsPoint[];
  tone?: "light" | "dark";
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => { ensureChartStyles(); }, []);

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[260px] w-full items-center justify-center rounded-xl border p-4 text-xs font-semibold",
          tone === "dark"
            ? "border-command-line bg-command-panel/40 text-command-muted"
            : "border-border bg-muted/30 text-muted-foreground",
        )}
      >
        <span>No wait analytics recorded yet.</span>
      </div>
    );
  }

  const isDark = tone === "dark";
  const w = 640;
  const h = 280;
  const pad = { top: 30, bottom: 60, left: 48, right: 20 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const max = Math.max(1, ...data.map((d) => Math.max(d.beforeMin ?? 0, d.afterMin ?? 0))) * 1.18;
  const band = chartW / Math.max(1, data.length);
  const barW = Math.max(8, band / 2 - 10);
  const axisText = isDark ? "var(--command-muted)" : "var(--muted-foreground)";
  const gridColor = isDark ? "var(--command-line)" : "oklch(0.92 0.008 250)";
  const scale = (v: number) => (v / max) * chartH;

  // Y-axis ticks
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((max * i) / yTicks));

  // Total averages
  const avgBefore = Math.round(data.reduce((s, d) => s + d.beforeMin, 0) / data.length);
  const avgAfter = Math.round(data.reduce((s, d) => s + d.afterMin, 0) / data.length);
  const improvementPct = avgBefore > 0 ? Math.round(((avgBefore - avgAfter) / avgBefore) * 100) : 0;

  return (
    <div className="ks-chart-enter">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full select-none" role="img" aria-label="Waiting time analytics — Before vs After Kisan Setu">
        <defs>
          <linearGradient id="ks-wa-before" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? "var(--command-line)" : "oklch(0.78 0.025 260)"} stopOpacity="1" />
            <stop offset="100%" stopColor={isDark ? "var(--command-line)" : "oklch(0.78 0.025 260)"} stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="ks-wa-after" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--leaf)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--leaf)" stopOpacity="0.7" />
          </linearGradient>
          <filter id="ks-wa-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={w} height={h} fill={isDark ? "var(--command-panel)" : "white"} rx="16" />

        {/* Grid + Y labels */}
        {yTickVals.map((val) => {
          const yPos = pad.top + chartH - scale(val);
          return (
            <g key={`wy-${val}`}>
              <line x1={pad.left} x2={pad.left + chartW} y1={yPos} y2={yPos} stroke={gridColor} strokeWidth="0.8" />
              <text x={pad.left - 8} y={yPos + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill={axisText} fontFamily="Inter, system-ui, sans-serif">
                {val}m
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = pad.left + i * band + (band - barW * 2 - 8) / 2;
          const bH = scale(d.beforeMin);
          const aH = scale(d.afterMin);
          const reductionPct = d.beforeMin > 0 ? Math.round(((d.beforeMin - d.afterMin) / d.beforeMin) * 100) : 0;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={d.label}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Hover highlight band */}
              {isHovered && (
                <rect
                  x={pad.left + i * band}
                  y={pad.top}
                  width={band}
                  height={chartH}
                  fill={isDark ? "var(--command-fg)" : "var(--navy)"}
                  opacity="0.04"
                  rx="4"
                />
              )}

              {/* Before bar */}
              <rect
                x={x}
                y={pad.top + chartH - bH}
                width={barW}
                height={bH}
                rx="4"
                fill="url(#ks-wa-before)"
                filter="url(#ks-wa-shadow)"
                style={{ transition: "height 0.5s ease, y 0.5s ease" }}
              />
              {/* Before value label */}
              <text
                x={x + barW / 2}
                y={pad.top + chartH - bH - 6}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={isDark ? "var(--command-muted)" : "oklch(0.55 0.03 260)"}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {d.beforeMin}m
              </text>

              {/* After bar */}
              <rect
                x={x + barW + 8}
                y={pad.top + chartH - aH}
                width={barW}
                height={aH}
                rx="4"
                fill="url(#ks-wa-after)"
                filter="url(#ks-wa-shadow)"
                style={{ transition: "height 0.5s ease, y 0.5s ease" }}
              />
              {/* After value label */}
              <text
                x={x + barW + 8 + barW / 2}
                y={pad.top + chartH - aH - 6}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="var(--leaf)"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {d.afterMin}m
              </text>

              {/* Improvement % badge on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={x + barW / 2 + 4 - 22}
                    y={pad.top + chartH - bH - 28}
                    width="44"
                    height="16"
                    rx="4"
                    fill="var(--leaf)"
                    filter="url(#ks-wa-shadow)"
                  />
                  <text
                    x={x + barW / 2 + 4}
                    y={pad.top + chartH - bH - 16}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="800"
                    fill="white"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    ↓ {reductionPct}%
                  </text>
                </g>
              )}

              {/* X label */}
              <text
                x={x + barW + 4}
                y={pad.top + chartH + 16}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={isHovered ? (isDark ? "var(--command-fg)" : "var(--navy)") : axisText}
                fontFamily="Inter, system-ui, sans-serif"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Y-axis title */}
        <text
          x={14}
          y={pad.top + chartH / 2}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill={axisText}
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.08em"
          transform={`rotate(-90, 14, ${pad.top + chartH / 2})`}
        >
          WAIT TIME (MINUTES)
        </text>

        {/* Summary badge */}
        <g>
          <rect x={w - 190} y={8} width="182" height="20" rx="6" fill="var(--leaf)" opacity="0.12" />
          <text
            x={w - 99}
            y={22}
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fill="var(--leaf)"
            fontFamily="Inter, system-ui, sans-serif"
          >
            ✓ {improvementPct}% avg wait reduction
          </text>
        </g>

        {/* Legend */}
        <g transform={`translate(${pad.left}, ${h - 16})`}>
          <rect x="0" y="-8" width="12" height="12" rx="3" fill="url(#ks-wa-before)" />
          <text x="17" y="2" fontSize="10" fontWeight="700" fill={isDark ? "var(--command-fg)" : "var(--foreground)"} fontFamily="Inter, system-ui, sans-serif">
            Before Kisan Setu (avg {avgBefore}m)
          </text>
          <rect x="200" y="-8" width="12" height="12" rx="3" fill="var(--leaf)" />
          <text x="217" y="2" fontSize="10" fontWeight="700" fill={isDark ? "var(--command-fg)" : "var(--foreground)"} fontFamily="Inter, system-ui, sans-serif">
            After Kisan Setu (avg {avgAfter}m)
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   3. THROUGHPUT CHART — Quintals Processed with Smooth Area + Labels
   ════════════════════════════════════════════════════════════════ */

export function ThroughputChart({ data }: { data: ThroughputPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => { ensureChartStyles(); }, []);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[240px] w-full items-center justify-center rounded-xl border border-command-line bg-command-panel/40 p-4 text-xs font-semibold text-command-muted">
        <span>No throughput points recorded yet.</span>
      </div>
    );
  }

  const w = 640;
  const h = 260;
  const pad = { top: 30, bottom: 56, left: 52, right: 20 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const max = Math.max(1, ...data.map((d) => d.quintals ?? 0)) * 1.2;
  const px = (i: number) => pad.left + (i * chartW) / Math.max(1, data.length - 1);
  const py = (v: number) => pad.top + chartH - (v / max) * chartH;
  const pts = data.map((d, i) => ({ x: px(i), y: py(d.quintals ?? 0) }));

  const peakIdx = data.reduce((pi, d, i) => ((d.quintals ?? 0) > (data[pi]?.quintals ?? 0) ? i : pi), 0);
  const total = data.reduce((s, d) => s + (d.quintals ?? 0), 0);

  // Y-axis ticks
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((max * i) / yTicks));

  return (
    <div className="ks-chart-enter">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full select-none" role="img" aria-label="Throughput per hour in quintals">
        <defs>
          <linearGradient id="ks-tp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--saffron)" stopOpacity="0.40" />
            <stop offset="50%" stopColor="var(--saffron)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--saffron)" stopOpacity="0.01" />
          </linearGradient>
          <filter id="ks-tp-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>

        <rect x="0" y="0" width={w} height={h} fill="var(--command-panel)" rx="16" />

        {/* Grid + Y labels */}
        {yTickVals.map((val) => {
          const yPos = py(val);
          return (
            <g key={`ty-${val}`}>
              <line x1={pad.left} x2={pad.left + chartW} y1={yPos} y2={yPos} stroke="var(--command-line)" strokeWidth="0.8" />
              <text x={pad.left - 8} y={yPos + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--command-muted)" fontFamily="Inter, system-ui, sans-serif">
                {val}q
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path
          d={`${smoothPath(pts)} L${px(data.length - 1)},${pad.top + chartH} L${pad.left},${pad.top + chartH} Z`}
          fill="url(#ks-tp-fill)"
        />

        {/* Line */}
        <path
          d={smoothPath(pts)}
          fill="none"
          stroke="var(--saffron)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ks-line-draw"
        />

        {/* Data dots + hover */}
        {pts.map((p, i) => (
          <g
            key={`tpd-${i}`}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: "pointer" }}
          >
            {/* Invisible hit area */}
            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={i === peakIdx ? 6 : hoveredIdx === i ? 5.5 : 4}
              fill="var(--saffron)"
              stroke="var(--command-panel)"
              strokeWidth="2.5"
              style={{ transition: "r 0.15s ease" }}
            />
            {/* Value label on hover or at peak */}
            {(hoveredIdx === i || i === peakIdx) && (
              <g>
                <rect
                  x={p.x - 22}
                  y={p.y - 24}
                  width="44"
                  height="17"
                  rx="5"
                  fill={i === peakIdx ? "var(--saffron)" : "var(--command)"}
                  stroke={i === peakIdx ? "var(--saffron)" : "var(--command-line)"}
                  strokeWidth="1"
                  filter="url(#ks-tp-shadow)"
                />
                <text
                  x={p.x}
                  y={p.y - 11.5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="800"
                  fill="white"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {data[i]?.quintals ?? 0}q
                </text>
              </g>
            )}
          </g>
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={d.label} x={px(i)} y={pad.top + chartH + 18} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--command-muted)" fontFamily="Inter, system-ui, sans-serif">
            {d.label}
          </text>
        ))}

        {/* Y-axis title */}
        <text
          x={14}
          y={pad.top + chartH / 2}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="var(--command-muted)"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.08em"
          transform={`rotate(-90, 14, ${pad.top + chartH / 2})`}
        >
          QUINTALS PROCESSED
        </text>

        {/* Summary badge */}
        <g>
          <rect x={w - 170} y={8} width="162" height="20" rx="6" fill="var(--saffron)" opacity="0.15" />
          <text x={w - 89} y={22} textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--saffron)" fontFamily="Inter, system-ui, sans-serif">
            Total: {total.toLocaleString("en-IN")} quintals
          </text>
        </g>

        {/* Legend */}
        <g transform={`translate(${pad.left}, ${h - 14})`}>
          <circle cx="6" cy="-2" r="4.5" fill="var(--saffron)" />
          <text x="15" y="2" fontSize="10" fontWeight="700" fill="var(--command-fg)" fontFamily="Inter, system-ui, sans-serif">
            Hourly Throughput
          </text>
          <rect x="140" y="-8" width="10" height="10" rx="2" fill="var(--saffron)" opacity="0.85" />
          <text x="155" y="2" fontSize="10" fontWeight="700" fill="var(--command-fg)" fontFamily="Inter, system-ui, sans-serif">
            Peak Hour
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   4. RADIAL GAUGE — Capacity Ring with Animated Fill
   ════════════════════════════════════════════════════════════════ */

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
  const isDark = tone === "dark";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label} ${pct}%`}>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" stroke={isDark ? "var(--command-line)" : "var(--muted)"} />
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
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="20"
          fontWeight="800"
          fill={isDark ? "var(--command-fg)" : "var(--navy)"}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {pct}%
        </text>
      </svg>
      <span className={cn("text-[11px] font-semibold", isDark ? "text-command-muted" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}
