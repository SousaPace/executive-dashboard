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
  /** null = no data that day: a gap, never a zero. */
  values: (number | null)[];
  mode: "area" | "bars";
  unit: Unit;
  plan?: { label: string; value: number };
  label: string;
}) {
  const [ref, { width: W, height: H }] = useSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradient = `g${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fmt = (n: number | null) => formatValue(unit, n);

  const M = { top: 34, right: 16, bottom: 30, left: 64 };
  const PW = Math.max(W - M.left - M.right, 1);
  const PH = Math.max(H - M.top - M.bottom, 1);
  const n = values.length;
  const known = values.filter((v): v is number => v !== null);
  const lastIdx = values.findLastIndex((v) => v !== null);
  const { lo, hi, ticks } = scale(
    plan ? [...known, plan.value] : known.length ? known : [0],
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
  // Runs of consecutive days with data; a missing day breaks the line.
  const runs: number[][] = [];
  values.forEach((v, i) => {
    if (v === null) return;
    if (i > 0 && values[i - 1] !== null) runs[runs.length - 1].push(i);
    else runs.push([i]);
  });
  const pts = (run: number[]) =>
    run.map((i) => `${x(i)},${y(values[i]!)}`).join(" ");
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
        aria-label={`${label}. Último: ${lastIdx >= 0 ? fmt(values[lastIdx]) : "sin datos"}${plan ? `. ${plan.label} ${fmt(plan.value)}` : ""}`}
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

            {lastIdx >= 0 &&
              ticks.map((t) => (
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
            {lastIdx >= 0 &&
              xLabels.map((i) => (
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
              values.map((v, i) =>
                v === null ? null : (
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
                ),
              )}

            {mode === "area" && lastIdx >= 0 && (
              <>
                {runs.map((run) => (
                  <g key={run[0]}>
                    <polygon
                      points={`${x(run[0])},${base} ${pts(run)} ${x(run[run.length - 1])},${base}`}
                      fill={`url(#${gradient})`}
                    />
                    <polyline
                      points={pts(run)}
                      fill="none"
                      stroke={SERIES}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </g>
                ))}
                <circle
                  cx={x(lastIdx)}
                  cy={y(values[lastIdx]!)}
                  r={4.5}
                  fill={SERIES}
                  stroke="var(--color-panel)"
                  strokeWidth={2}
                />
              </>
            )}

            {plan && lastIdx >= 0 && (
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

            {lastIdx < 0 && (
              <text
                x={M.left + PW / 2}
                y={M.top + PH / 2}
                textAnchor="middle"
                fontSize={14}
                fill="var(--color-ink-3)"
              >
                Sin datos en el Excel
              </text>
            )}

            {active !== null && mode === "area" && values[active] !== null && (
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
                  cy={y(values[active]!)}
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
              top: Math.max(y(values[active] ?? hi) - 64, 4),
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

/**
 * One column per category (aging buckets): y-axis from $0, value label on top of each column,
 * hover tooltip with amount and share of the total.
 */
export function CategoryColumns({
  rows,
  color,
  label,
}: {
  rows: { key: string; label: string; value: number }[];
  /** Categorical slot: AR = 1 (blue), AP = 2 (orange). */
  color: 1 | 2 | 3;
  label: string;
}) {
  const [ref, { width: W, height: H }] = useSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const fill = `var(--color-series-${color})`;
  const M = { top: 28, right: 8, bottom: 28, left: 56 };
  const PW = Math.max(W - M.left - M.right, 1);
  const PH = Math.max(H - M.top - M.bottom, 1);
  const n = rows.length;
  const total = rows.reduce((a, r) => a + r.value, 0);
  const { hi, ticks } = scale(
    rows.map((r) => Math.max(r.value, 0)),
    true,
  );
  const y = (v: number) => M.top + PH - (Math.max(v, 0) / (hi || 1)) * PH;
  const band = PW / Math.max(n, 1);
  const x = (i: number) => M.left + band * i + band / 2;
  const barW = Math.min(band * 0.62, 72);
  const base = M.top + PH;
  const usd = (v: number) => formatValue("usd", v);
  const share = (v: number) =>
    total ? `${((v / total) * 100).toFixed(1)}%` : "—";

  return (
    <div className="relative min-h-48 w-full flex-1">
      <div
        ref={ref}
        className="absolute inset-0"
        role="img"
        aria-label={`${label}: ${rows.map((r) => `${r.label} ${usd(r.value)}`).join(", ")}`}
      >
        {W > 0 && H > 0 && (
          <svg width={W} height={H} onPointerLeave={() => setActive(null)}>
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
                  {usd(t)}
                </text>
              </g>
            ))}
            {rows.map((r, i) => (
              <g
                key={r.key}
                opacity={active === null || active === i ? 1 : 0.55}
              >
                {r.value > 0 && (
                  <path
                    d={barPath(
                      x(i) - barW / 2,
                      y(r.value),
                      barW,
                      base - y(r.value),
                    )}
                    fill={fill}
                  />
                )}
                <text
                  x={x(i)}
                  y={y(r.value) - 8}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={700}
                  fill="var(--color-ink)"
                >
                  {usd(r.value)}
                </text>
                <text
                  x={x(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={12}
                  fill="var(--color-ink-2)"
                >
                  {r.label}
                </text>
                {/* Hit target: the whole band, bigger than the column. */}
                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={PH}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                />
              </g>
            ))}
          </svg>
        )}
        {active !== null && W > 0 && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm shadow-lg"
            style={{
              top: Math.max(y(rows[active].value) - 70, 4),
              ...(x(active) > W * 0.6
                ? { right: W - x(active) + barW / 2 + 8 }
                : { left: x(active) + barW / 2 + 8 }),
            }}
          >
            <div className="text-xs text-ink-3">{rows[active].label}</div>
            <div className="font-bold text-ink">{usd(rows[active].value)}</div>
            <div className="text-xs text-ink-2">
              {share(rows[active].value)} del total
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
