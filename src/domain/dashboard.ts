import {
  METRICS,
  cashConversionCycle,
  daysOf,
  pctOfPlan,
  type Direction,
  type MetricKey,
  type MetricUnit,
} from "./kpis";

/**
 * Raw inputs → dashboard. The same arithmetic serves the uploaded Excel and the mock, so the
 * screen never computes a KPI two different ways. A missing value is `null` and stays null:
 * it is never turned into 0.
 */

export type DayInput = {
  /** "YYYY-MM-DD". */
  date: string;
  collections: number | null;
  ar: number | null;
  ap: number | null;
  /** Taken as given: the DPO formula is not defined yet (BR pending). */
  dpo: number | null;
  rm: number | null;
  wip: number | null;
  fg: number | null;
  sales: number | null;
  openPos: number | null;
};

export type PlanInput = {
  /** Month totals for flows; spread evenly over `salesDays` (Budget MTD = plan / días × día). */
  collectionsMonth: number | null;
  salesMonth: number | null;
  salesDays: number | null;
  /** Balances and day metrics: a single target for the month. */
  arAging: number | null;
  dso: number | null;
  apAging: number | null;
  dpo: number | null;
  inventory: number | null;
  dio: number | null;
  ccc: number | null;
  openPos: number | null;
};

export type AgingBucket = { key: string; label: string; value: number };

export type DashboardInput = {
  days: DayInput[];
  plan: PlanInput;
  arAging: AgingBucket[] | null;
  apAging: AgingBucket[] | null;
};

export type DataSource =
  | { kind: "mock" }
  | { kind: "excel"; fileName: string; uploadedAt: string; warnings: string[] };

export type MetricRow = {
  key: MetricKey;
  label: string;
  definition: string;
  unit: MetricUnit;
  direction: Direction;
  day: number | null;
  mtd: number | null;
  plan: number | null;
  pctVsPlan: number | null;
  /** Why the value is incomplete, shown on the card (e.g. inventory without RM). */
  note?: string;
};

type Series = (number | null)[];

export type FinanceDashboard = {
  source: DataSource;
  /** Last date with any value, "YYYY-MM-DD"; null when the file has no data yet. */
  asOf: string | null;
  days: { key: string; label: string }[];
  rows: Record<MetricKey, MetricRow>;
  series: {
    collections: Series;
    sales: Series;
    ar: Series;
    ap: Series;
    rm: Series;
    wip: Series;
    fg: Series;
    inventory: Series;
    openPos: Series;
    dso: Series;
    dio: Series;
    dpo: Series;
    ccc: Series;
  };
  dailyPlan: { collections: number | null; sales: number | null };
  arAging: AgingBucket[] | null;
  apAging: AgingBucket[] | null;
};

const present = (xs: Series) => xs.filter((x): x is number => x !== null);
const sum = (xs: Series) => {
  const v = present(xs);
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};
const avg = (xs: Series) => {
  const v = present(xs);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const last = <T>(xs: T[]): T | null => (xs.length ? xs[xs.length - 1] : null);
const round1 = (n: number | null) =>
  n === null ? null : Math.round(n * 10) / 10;

const hasData = (d: DayInput) =>
  (Object.keys(d) as (keyof DayInput)[]).some(
    (k) => k !== "date" && d[k] !== null,
  );

export function buildDashboard(
  input: DashboardInput,
  source: DataSource,
): FinanceDashboard {
  const sorted = [...input.days].sort((a, b) => a.date.localeCompare(b.date));
  const lastIdx = sorted.findLastIndex(hasData);
  const days = lastIdx < 0 ? [] : sorted.slice(0, lastIdx + 1);
  const col = (k: Exclude<keyof DayInput, "date">) => days.map((d) => d[k]);

  const collections = col("collections");
  const sales = col("sales");
  const ar = col("ar");
  const ap = col("ap");
  const dpo = col("dpo");
  const rm = col("rm");
  const wip = col("wip");
  const fg = col("fg");
  const openPos = col("openPos");

  // RM + WIP + FG with the parts that exist; the card says which part is missing.
  const inventory = days.map((_, i) => sum([rm[i], wip[i], fg[i]]));
  const lastDay = last(days);
  const missingParts = lastDay
    ? (["rm", "wip", "fg"] as const)
        .filter((p) => lastDay[p] === null)
        .map((p) => p.toUpperCase())
    : [];

  // "Venta diaria promedio": mean of the month's daily sales so far (blank days excluded, like
  // the AVERAGE column of the Daily Sales Report). Window still pending as a business rule.
  const avgSales = days.map((_, i) => avg(sales.slice(0, i + 1)));
  const dso = days.map((_, i) =>
    ar[i] === null || avgSales[i] === null ? null : daysOf(ar[i], avgSales[i]),
  );
  const dio = days.map((_, i) =>
    inventory[i] === null || avgSales[i] === null
      ? null
      : daysOf(inventory[i], avgSales[i]),
  );
  const ccc = days.map((_, i) => cashConversionCycle(dso[i], dio[i], dpo[i]));

  const { plan } = input;
  const perDay = (month: number | null) =>
    month !== null && plan.salesDays ? month / plan.salesDays : null;
  const dailyPlan = {
    collections: perDay(plan.collectionsMonth),
    sales: perDay(plan.salesMonth),
  };
  const planToDate = (daily: number | null) =>
    daily === null ? null : daily * days.length;

  const row = (
    key: MetricKey,
    day: number | null,
    mtd: number | null,
    target: number | null,
    note?: string,
  ): MetricRow => ({
    key,
    ...METRICS[key],
    day,
    mtd,
    plan: target,
    pctVsPlan: pctOfPlan(mtd, target),
    ...(note ? { note } : {}),
  });
  const flow = (key: MetricKey, xs: Series, daily: number | null) =>
    row(key, last(xs), sum(xs), planToDate(daily));
  const balance = (
    key: MetricKey,
    xs: Series,
    target: number | null,
    note?: string,
  ) => row(key, last(xs), round1(avg(xs)), target, note);

  const inventoryNote = missingParts.length
    ? `Incompleto: sin ${missingParts.join(", ")}`
    : undefined;

  return {
    source,
    asOf: lastDay?.date ?? null,
    days: days.map((d) => ({
      key: d.date,
      label: String(Number(d.date.slice(8))),
    })),
    rows: {
      collections: flow("collections", collections, dailyPlan.collections),
      arAging: balance("arAging", ar, plan.arAging),
      dso: balance("dso", dso, plan.dso),
      apAging: balance("apAging", ap, plan.apAging),
      dpo: balance("dpo", dpo, plan.dpo),
      inventory: balance("inventory", inventory, plan.inventory, inventoryNote),
      dio: balance("dio", dio, plan.dio, inventoryNote),
      ccc: balance("ccc", ccc, plan.ccc, inventoryNote),
      dailySales: flow("dailySales", sales, dailyPlan.sales),
      openPos: balance("openPos", openPos, plan.openPos),
    },
    series: {
      collections,
      sales,
      ar,
      ap,
      rm,
      wip,
      fg,
      inventory,
      openPos,
      dso,
      dio,
      dpo,
      ccc,
    },
    dailyPlan,
    arAging: input.arAging,
    apAging: input.apAging,
  };
}
