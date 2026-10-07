import type { ReactNode } from "react";
import type { AgingBucket, MetricRow } from "@/domain/dashboard";
import { planStatus, type PlanStatus } from "@/domain/kpis";
import { Sparkline } from "./charts";
import { daysText, formatValue, pct, usd } from "./format";

const STATUS: Record<
  PlanStatus,
  { label: string; icon: string; border: string; dot: string }
> = {
  on: {
    label: "En plan",
    icon: "✓",
    border: "border-ok",
    dot: "bg-ok text-bg",
  },
  near: {
    label: "Cerca del plan",
    icon: "!",
    border: "border-warn",
    dot: "bg-warn text-bg",
  },
  off: {
    label: "Fuera de plan",
    icon: "✕",
    border: "border-bad",
    dot: "bg-bad text-white",
  },
};

export function StatusBadge({ status }: { status: PlanStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg/70 py-0.5 pl-1 pr-2.5 text-xs font-bold whitespace-nowrap">
      <span
        className={`grid size-4.5 place-items-center rounded-full text-[11px] font-black ${s.dot}`}
        aria-hidden
      >
        {s.icon}
      </span>
      {s.label}
    </span>
  );
}

/** Headline KPI: MTD big, daily trend, then Day · Plan · % vs Plan. Border = plan status. */
export function KpiCard({
  row,
  trend,
}: {
  row: MetricRow;
  trend: (number | null)[];
}) {
  const status = planStatus(row.pctVsPlan, row.direction);
  const big =
    row.mtd === null
      ? "—"
      : row.unit === "usd"
        ? usd(row.mtd)
        : String(Math.round(row.mtd));
  return (
    <article
      className={`flex min-w-0 flex-col rounded-xl border-2 bg-panel ${status ? STATUS[status].border : "border-line"}`}
    >
      <div className="flex flex-col gap-1 px-4 pt-3">
        <div className="flex items-start gap-2">
          <h3 className="text-lg font-bold">{row.label}</h3>
          <span className="ml-auto">
            {status && <StatusBadge status={status} />}
          </span>
        </div>
        <p className="line-clamp-1 text-sm text-ink-2" title={row.definition}>
          {row.definition}
        </p>
        <div className="mt-3 text-xs font-bold tracking-wider text-ink-2">
          MTD
        </div>
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="font-display text-[2.6rem] font-black tracking-tight">
            {big}
          </span>
          {row.unit === "days" && row.mtd !== null && (
            <span className="text-lg font-semibold text-ink-2">días</span>
          )}
        </div>
        {row.note && (
          <p className="text-xs font-semibold text-warn">⚠ {row.note}</p>
        )}
        <div className="mt-1">
          <Sparkline values={trend.filter((v): v is number => v !== null)} />
        </div>
      </div>
      <dl className="mt-auto grid grid-cols-3 divide-x divide-line border-t border-line">
        {[
          ["Day", formatValue(row.unit, row.day)],
          ["Plan", formatValue(row.unit, row.plan)],
          ["% vs Plan", row.pctVsPlan === null ? "—" : pct(row.pctVsPlan)],
        ].map(([k, v]) => (
          <div key={k} className="px-4 py-2">
            <dt className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
              {k}
            </dt>
            <dd className="font-bold">{v}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col rounded-xl border border-line bg-panel px-5 py-4 ${className}`}
    >
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-ink-2">{subtitle}</p>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

/** CCC as a waterfall in days: DSO and DIO add, DPO subtracts, CCC is the result. */
export function CccBreakdown({
  dso,
  dio,
  dpo,
}: {
  dso: number | null;
  dio: number | null;
  dpo: number | null;
}) {
  if (dso === null || dio === null || dpo === null) {
    const missing = [
      dso === null && "DSO",
      dio === null && "DIO",
      dpo === null && "DPO",
    ].filter(Boolean);
    return <Empty>Sin datos: falta {missing.join(", ")} en el Excel.</Empty>;
  }
  const ccc = dso + dio - dpo;
  const max = Math.max(dso + dio, ccc, 1);
  const pctOf = (v: number) => `${(Math.max(v, 0) / max) * 100}%`;
  const d1 = (n: number) =>
    n.toLocaleString("es-MX", { maximumFractionDigits: 1 });
  const rows = [
    {
      k: "DSO",
      from: 0,
      len: dso,
      color: "bg-series-1",
      text: `+${d1(dso)} d`,
    },
    {
      k: "DIO",
      from: dso,
      len: dio,
      color: "bg-series-1",
      text: `+${d1(dio)} d`,
    },
    {
      k: "DPO",
      from: dso + dio - dpo,
      len: dpo,
      color: "bg-series-2",
      text: `−${d1(dpo)} d`,
    },
  ];
  const bar = (from: number, len: number, color: string) => (
    <div className="relative h-6 flex-1 border-l border-line">
      <div
        className={`absolute inset-y-0 rounded ${color}`}
        style={{ left: pctOf(from), width: pctOf(len) }}
      />
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center gap-3">
          <span className="w-10 font-bold">{r.k}</span>
          {bar(r.from, r.len, r.color)}
          <span className="w-20 text-right font-bold">{r.text}</span>
        </div>
      ))}
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <span className="w-10 font-bold">CCC</span>
        {bar(0, ccc, "bg-ink")}
        <span className="w-20 text-right font-bold">
          {daysText(ccc).replace(" días", " d")}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-series-1" /> Suma días
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-series-2" /> Resta días
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-ink" /> Ciclo resultante
        </li>
      </ul>
    </div>
  );
}

/** Part-to-whole: one stacked bar (2px gaps) + legend with value and share. */
export function MixBar({
  parts,
}: {
  parts: { key: string; label: string; value: number | null; color: string }[];
}) {
  const known = parts.filter(
    (p): p is typeof p & { value: number } => p.value !== null,
  );
  if (!known.length) return <Empty>Sin desglose RM / WIP / FG en el Excel.</Empty>;
  const missing = parts.filter((p) => p.value === null).map((p) => p.label);
  const total = known.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-10 gap-0.5 overflow-hidden rounded">
        {known.map((p) => (
          <div
            key={p.key}
            className={p.color}
            style={{ width: `${(p.value / total) * 100}%` }}
            title={`${p.label}: ${usd(p.value)}`}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {known.map((p) => (
          <li key={p.key} className="flex items-center gap-3 text-lg">
            <span className={`size-3 rounded-sm ${p.color}`} />
            <span className="font-bold">{p.label}</span>
            <span className="ml-auto">{usd(p.value)}</span>
            <span className="w-16 text-right text-ink-2">
              {pct((p.value / total) * 100)}
            </span>
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <p className="text-sm font-semibold text-warn">
          ⚠ Sin dato de {missing.join(", ")}
        </p>
      )}
    </div>
  );
}

/** Aging buckets as horizontal bars, value and share at the tip. */
export function AgingBars({
  buckets,
  sheet,
}: {
  buckets: AgingBucket[] | null;
  /** Excel sheet that feeds it, named in the empty state. */
  sheet: string;
}) {
  if (!buckets) return <Empty>Sin datos en la hoja “{sheet}” del Excel.</Empty>;
  const total = buckets.reduce((a, b) => a + b.value, 0) || 1;
  const max = Math.max(...buckets.map((b) => b.value), 1);
  return (
    <ul className="flex flex-col justify-around gap-3">
      {buckets.map((b) => (
        <li
          key={b.key}
          className="grid grid-cols-[6.5rem_1fr_5rem_3.5rem] items-center gap-3"
        >
          <span className="font-semibold text-ink-2">{b.label}</span>
          <span className="relative h-6 border-l border-line">
            <span
              className="absolute inset-y-0 left-0 rounded-r bg-series-1"
              style={{ width: `${(b.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-bold">{usd(b.value)}</span>
          <span className="text-right text-sm text-ink-2">
            {pct((b.value / total) * 100)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="grid flex-1 place-items-center rounded-lg border border-dashed border-line p-6 text-center text-ink-3">
      {children}
    </p>
  );
}
