"use client";

import { useId, useState } from "react";
import { formatValue, shortDate, type Unit } from "./format";
import { useSize } from "./use-size";

/**
 * Dark-theme SVG charts. One y-axis, 2px lines, bars with a 4px rounded data end, recessive
 * grid, dashed plan reference labeled in the legend, crosshair/hover tooltip on every chart.
 */

const SERIES = "var(--color-series-1)";

function niceStep(range: number, count: number): number {
  const raw = range / count;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

/** Y domain + ticks. Bars always start at zero; lines zoom on their range. */
function scale(values: number[], fromZero: boolean) {
  const lo0 = fromZero ? 0 : Math.min(...values);
  const hi0 = Math.max(...values, lo0 + 1);
  const step = niceStep(hi0 - lo0 || hi0, 4);
  const lo = fromZero ? 0 : Math.floor(lo0 / step) * step;
  const hi = Math.ceil(hi0 / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t);
  return { lo, hi, ticks };
}

function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function TrendChart({
  dates,
  values,
  mode,
  unit,
  plan,
  label,
}: {
  /** "YYYY-MM-DD" per point. */
  dates: string[];
  values: number[];
  mode: "area" | "bars";
  unit: Unit;
  plan?: { label: string; value: number };
  label: string;
}) {
  const [ref, { width: W, height: H }] = useSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradient = `g${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fmt = (n: number) => formatValue(unit, n);

  const M = { top: 34, right: 16, bottom: 30, left: 64 };
  const PW = Math.max(W - M.left - M.right, 1);
  const PH = Math.max(H - M.top - M.bottom, 1);
  const n = values.length;
  const { lo, hi, ticks } = scale(
    plan ? [...values, plan.value] : values,
    mode === "bars",
  );
  const y = (v: number) => M.top + PH - ((v - lo) / (hi - lo || 1)) * PH;
  const band = PW / Math.max(n, 1);
  const x = (i: number) =>
    mode === "bars"
      ? M.left + band * i + band / 2
      : M.left + (n > 1 ? (PW * i) / (n - 1) : PW / 2);
  const xLabels = n ? [...new Set([0, Math.floor((n - 1) / 2), n - 1])] : [];
  const barW = Math.min(band * 0.7, 32);
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const base = M.top + PH;

  const pick = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - M.left;
    const i =
      mode === "bars" ? Math.floor(px / band) : Math.round((px / PW) * (n - 1));
    setActive(Math.min(Math.max(i, 0), n - 1));
  };

  return (
    // Measured box is absolutely positioned, so its size comes only from the panel layout.
    <div className="relative min-h-48 w-full flex-1">
      <div
        ref={ref}
        className="absolute inset-0"
        tabIndex={0}
        role="img"
        aria-label={`${label}. Último: ${n ? fmt(values[n - 1]) : "sin datos"}${plan ? `. ${plan.label} ${fmt(plan.value)}` : ""}`}
        onKeyDown={(e) => {
          // Arrow keys step through the points here instead of changing the carousel view.
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setActive((a) => Math.min((a ?? -1) + 1, n - 1));
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setActive((a) => Math.max((a ?? n) - 1, 0));
          }
        }}
        onBlur={() => setActive(null)}
      >
        {plan && (
          <div className="pointer-events-none absolute right-4 top-1 flex items-center gap-2 text-xs font-semibold text-ink-2">
            <svg width={22} height={4} aria-hidden>
              <line
                x1={0}
                x2={22}
                y1={2}
                y2={2}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
            </svg>
            {plan.label} {fmt(plan.value)}
          </div>
        )}
        {W > 0 && H > 0 && (
          <svg
            width={W}
            height={H}
            className="absolute inset-0"
            onPointerMove={(e) =>
              pick(e.clientX, e.currentTarget.getBoundingClientRect())
            }
            onPointerLeave={() => setActive(null)}
          >
            <defs>
              <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={SERIES} stopOpacity={0.28} />
                <stop offset="100%" stopColor={SERIES} stopOpacity={0.04} />
              </linearGradient>
            </defs>

            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={M.left}
                  x2={M.left + PW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--color-grid)"
                  strokeWidth={1}
                />
                <text
                  x={M.left - 10}
                  y={y(t) + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="var(--color-ink-3)"
                >
                  {fmt(t)}
                </text>
              </g>
            ))}
            {xLabels.map((i) => (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor={
                  mode === "bars"
                    ? "middle"
                    : i === 0
                      ? "start"
                      : i === n - 1
                        ? "end"
                        : "middle"
                }
                fontSize={12}
                fill="var(--color-ink-3)"
              >
                {shortDate(dates[i])}
              </text>
            ))}

            {mode === "bars" &&
              values.map((v, i) => (
                <path
                  key={dates[i]}
                  d={barPath(
                    x(i) - barW / 2,
                    y(v),
                    barW,
                    Math.max(base - y(v), 0),
                  )}
                  fill={SERIES}
                  opacity={active === null || active === i ? 1 : 0.55}
                />
              ))}

            {mode === "area" && n > 0 && (
              <>
                <polygon
                  points={`${x(0)},${base} ${line} ${x(n - 1)},${base}`}
                  fill={`url(#${gradient})`}
                />
                <polyline
                  points={line}
                  fill="none"
                  stroke={SERIES}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle
                  cx={x(n - 1)}
                  cy={y(values[n - 1])}
                  r={4.5}
                  fill={SERIES}
                  stroke="var(--color-panel)"
                  strokeWidth={2}
                />
              </>
            )}

            {plan && (
              <line
                x1={M.left}
                x2={M.left + PW}
                y1={y(plan.value)}
                y2={y(plan.value)}
                stroke="var(--color-ink-2)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
            )}

            {active !== null && mode === "area" && (
              <>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={M.top}
                  y2={base}
                  stroke="var(--color-ink-3)"
                  strokeWidth={1}
                />
                <circle
                  cx={x(active)}
                  cy={y(values[active])}
                  r={5}
                  fill={SERIES}
                  stroke="var(--color-panel)"
                  strokeWidth={2}
                />
              </>
            )}
          </svg>
        )}
        {active !== null && W > 0 && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm shadow-lg"
            style={{
              top: Math.max(y(values[active]) - 64, 4),
              ...(x(active) > W * 0.6
                ? { right: W - x(active) + 12 }
                : { left: x(active) + 12 }),
            }}
          >
            <div className="text-xs text-ink-3">{shortDate(dates[active])}</div>
            <div className="font-bold text-ink">{fmt(values[active])}</div>
            {plan && (
              <div className="text-xs text-ink-2">
                {plan.label} {fmt(plan.value)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Tiny trend inside a KPI card: area + 2px line + end dot, no axes. */
export function Sparkline({ values }: { values: number[] }) {
  const [ref, { width: W, height: H }] = useSize<HTMLDivElement>();
  const gradient = `g${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const n = values.length;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = 6;
  const x = (i: number) =>
    pad / 2 + (n > 1 ? ((W - pad) * i) / (n - 1) : (W - pad) / 2);
  const y = (v: number) =>
    pad + (1 - (v - lo) / (hi - lo || 1)) * (H - 2 * pad);
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <div ref={ref} className="h-10 w-full" aria-hidden>
      {W > 0 && n > 0 && (
        <svg width={W} height={H}>
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.25} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <polygon
            points={`${x(0)},${H} ${line} ${x(n - 1)},${H}`}
            fill={`url(#${gradient})`}
          />
          <polyline
            points={line}
            fill="none"
            stroke={SERIES}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={x(n - 1)}
            cy={y(values[n - 1])}
            r={4}
            fill={SERIES}
            stroke="var(--color-panel)"
            strokeWidth={2}
          />
        </svg>
      )}
    </div>
  );
}
