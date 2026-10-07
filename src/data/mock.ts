import {
  METRICS,
  cashConversionCycle,
  daysOf,
  pctOfPlan,
  type MetricKey,
  type MetricUnit,
  type Direction,
} from "@/domain/kpis";

/**
 * MOCK financial dashboard. The real sources (cobranza, CxC, CxP, inventario valorizado, ventas,
 * órdenes abiertas) are not connected yet: every number here is SIMULATED. Deterministic per
 * month so the screen does not jump on every refresh. Replace `getFinanceDashboard` with a real
 * query that returns the same `FinanceDashboard` shape.
 */

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
};

export type AgingBucket = { key: string; label: string; value: number };

export type FinanceDashboard = {
  mock: true;
  /** Plant date "YYYY-MM-DD" of the last day with data. */
  asOf: string;
  monthLabel: string;
  /** Business days of the month through `asOf`. */
  days: { key: string; label: string }[];
  rows: Record<MetricKey, MetricRow>;
  series: {
    collections: number[];
    collectionsPlan: number[];
    sales: number[];
    salesPlan: number[];
    ar: number[];
    ap: number[];
    rm: number[];
    wip: number[];
    fg: number[];
    inventory: number[];
    openPos: number[];
    dso: (number | null)[];
    dio: (number | null)[];
    dpo: number[];
    ccc: (number | null)[];
  };
  arAging: AgingBucket[];
  apAging: AgingBucket[];
  openPosByCustomer: { key: string; label: string; value: number }[];
};

const AGING = [
  { key: "current", label: "Corriente" },
  { key: "1-30", label: "1–30 días" },
  { key: "31-60", label: "31–60 días" },
  { key: "61-90", label: "61–90 días" },
  { key: "90+", label: "+90 días" },
];

const PLAN = {
  dailyCollections: 430_000,
  dailySales: 450_000,
  arAging: 12_000_000,
  dso: 30,
  apAging: 9_500_000,
  dpo: 45,
  inventory: 12_500_000,
  dio: 28,
  openPos: 8_000_000,
};

/** Small seeded PRNG (mulberry32): same month → same numbers. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function businessDaysThrough(asOf: string): string[] {
  const [y, m, d] = asOf.split("-").map(Number);
  const out: string[] = [];
  for (let day = 1; day <= d; day++) {
    const wd = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
    if (wd !== 0 && wd !== 6)
      out.push(`${asOf.slice(0, 8)}${String(day).padStart(2, "0")}`);
  }
  return out.length ? out : [asOf];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round((sum(v) / v.length) * 10) / 10 : null;
};
const last = <T>(xs: T[]): T => xs[xs.length - 1];
const round = (n: number) => Math.round(n);

/** `today` is the plant date "YYYY-MM-DD". */
export function getFinanceDashboard(today: string): FinanceDashboard {
  const dates = businessDaysThrough(today);
  const [y, m] = today.split("-").map(Number);
  const rand = rng(y * 100 + m);
  const noise = (spread: number) => 1 + (rand() * 2 - 1) * spread;

  const sales: number[] = [];
  const collections: number[] = [];
  const ar: number[] = [];
  const ap: number[] = [];
  const rm: number[] = [];
  const wip: number[] = [];
  const fg: number[] = [];
  const openPos: number[] = [];
  const dpo: number[] = [];

  let arBal = 12_400_000 * noise(0.04);
  let apBal = 9_300_000 * noise(0.04);
  let rmBal = 5_800_000 * noise(0.05);
  let wipBal = 2_900_000 * noise(0.05);
  let fgBal = 4_100_000 * noise(0.05);
  let poBal = 7_700_000 * noise(0.05);
  let dpoVal = 44 * noise(0.05);

  for (let i = 0; i < dates.length; i++) {
    const s = round(430_000 * noise(0.18));
    const c = round(415_000 * noise(0.22));
    arBal += s - c;
    apBal *= noise(0.015);
    rmBal *= noise(0.02);
    wipBal *= noise(0.03);
    fgBal *= noise(0.025);
    poBal = poBal * noise(0.02) + (s - 430_000) * -0.3;
    dpoVal = dpoVal * noise(0.015);
    sales.push(s);
    collections.push(c);
    ar.push(round(arBal));
    ap.push(round(apBal));
    rm.push(round(rmBal));
    wip.push(round(wipBal));
    fg.push(round(fgBal));
    openPos.push(round(poBal));
    dpo.push(Math.round(dpoVal * 10) / 10);
  }

  // "Venta diaria promedio": mean of the month's business days so far (window = BR pending).
  const avgSalesThrough = (i: number) => sum(sales.slice(0, i + 1)) / (i + 1);
  const inventory = dates.map((_, i) => rm[i] + wip[i] + fg[i]);
  const dso = dates.map((_, i) => daysOf(ar[i], avgSalesThrough(i)));
  const dio = dates.map((_, i) => daysOf(inventory[i], avgSalesThrough(i)));
  const ccc = dates.map((_, i) => cashConversionCycle(dso[i], dio[i], dpo[i]));

  const collectionsPlan = dates.map(() => PLAN.dailyCollections);
  const salesPlan = dates.map(() => PLAN.dailySales);

  const row = (
    key: MetricKey,
    day: number | null,
    mtd: number | null,
    plan: number | null,
  ): MetricRow => ({
    key,
    ...METRICS[key],
    day,
    mtd,
    plan,
    pctVsPlan: pctOfPlan(mtd, plan),
  });
  const avgBal = (xs: number[]) => round(sum(xs) / xs.length);

  const rows: Record<MetricKey, MetricRow> = {
    collections: row(
      "collections",
      last(collections),
      sum(collections),
      sum(collectionsPlan),
    ),
    arAging: row("arAging", last(ar), avgBal(ar), PLAN.arAging),
    dso: row("dso", last(dso), avg(dso), PLAN.dso),
    apAging: row("apAging", last(ap), avgBal(ap), PLAN.apAging),
    dpo: row("dpo", last(dpo), avg(dpo), PLAN.dpo),
    inventory: row(
      "inventory",
      last(inventory),
      avgBal(inventory),
      PLAN.inventory,
    ),
    dio: row("dio", last(dio), avg(dio), PLAN.dio),
    ccc: row(
      "ccc",
      last(ccc),
      avg(ccc),
      cashConversionCycle(PLAN.dso, PLAN.dio, PLAN.dpo),
    ),
    dailySales: row("dailySales", last(sales), sum(sales), sum(salesPlan)),
    openPos: row("openPos", last(openPos), avgBal(openPos), PLAN.openPos),
  };

  const aging = (total: number, shares: number[]): AgingBucket[] => {
    const raw = shares.map((s) => s * noise(0.15));
    const k = total / sum(raw);
    return AGING.map((b, i) => ({ ...b, value: round(raw[i] * k) }));
  };

  const customers = [
    "Cliente A",
    "Cliente B",
    "Cliente C",
    "Cliente D",
    "Cliente E",
    "Otros",
  ];
  const poShares = [0.28, 0.22, 0.16, 0.12, 0.08, 0.14].map(
    (s) => s * noise(0.2),
  );
  const poK = last(openPos) / sum(poShares);

  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));

  return {
    mock: true,
    asOf: last(dates),
    monthLabel,
    days: dates.map((d) => ({ key: d, label: String(Number(d.slice(8))) })),
    rows,
    series: {
      collections,
      collectionsPlan,
      sales,
      salesPlan,
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
    arAging: aging(last(ar), [0.62, 0.21, 0.09, 0.05, 0.03]),
    apAging: aging(last(ap), [0.55, 0.27, 0.11, 0.05, 0.02]),
    openPosByCustomer: customers
      .map((c, i) => ({ key: c, label: c, value: round(poShares[i] * poK) }))
      .sort((a, b) =>
        a.key === "Otros" ? 1 : b.key === "Otros" ? -1 : b.value - a.value,
      ),
  };
}
