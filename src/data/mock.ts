import type { AgingBucket, DashboardInput, DayInput } from "@/domain/dashboard";

/**
 * SIMULATED inputs, shown only while no Excel has been uploaded. Deterministic per month so the
 * screen does not jump on every refresh.
 */

export const AGING_BUCKETS = [
  "Corriente",
  "1–30 días",
  "31–60 días",
  "61–90 días",
  "+90 días",
];

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

const round = (n: number) => Math.round(n);

/** `today` is the plant date "YYYY-MM-DD". */
export function mockInput(today: string): DashboardInput {
  const dates = businessDaysThrough(today);
  const [y, m] = today.split("-").map(Number);
  const rand = rng(y * 100 + m);
  const noise = (spread: number) => 1 + (rand() * 2 - 1) * spread;

  let arBal = 12_400_000 * noise(0.04);
  let apBal = 9_300_000 * noise(0.04);
  let rmBal = 5_800_000 * noise(0.05);
  let wipBal = 2_900_000 * noise(0.05);
  let fgBal = 4_100_000 * noise(0.05);
  let poBal = 7_700_000 * noise(0.05);
  let dpoVal = 44 * noise(0.05);

  const days: DayInput[] = dates.map((date) => {
    const sales = round(430_000 * noise(0.18));
    const collections = round(415_000 * noise(0.22));
    arBal += sales - collections;
    apBal *= noise(0.015);
    rmBal *= noise(0.02);
    wipBal *= noise(0.03);
    fgBal *= noise(0.025);
    poBal = poBal * noise(0.02) + (sales - 430_000) * -0.3;
    dpoVal *= noise(0.015);
    return {
      date,
      collections,
      sales,
      ar: round(arBal),
      ap: round(apBal),
      dpo: Math.round(dpoVal * 10) / 10,
      rm: round(rmBal),
      wip: round(wipBal),
      fg: round(fgBal),
      inventory: null,
      openPos: round(poBal),
    };
  });

  const aging = (total: number, shares: number[]): AgingBucket[] => {
    const raw = shares.map((s) => s * noise(0.15));
    const k = total / raw.reduce((a, b) => a + b, 0);
    return AGING_BUCKETS.map((label, i) => ({
      key: label,
      label,
      value: round(raw[i] * k),
    }));
  };
  const lastDay = days[days.length - 1];

  return {
    days,
    plan: {
      collectionsMonth: 430_000 * 20,
      salesMonth: 450_000 * 20,
      salesDays: 20,
      arAging: 12_000_000,
      dso: 30,
      apAging: 9_500_000,
      dpo: 45,
      inventory: 12_500_000,
      dio: 28,
      ccc: 13,
      openPos: 8_000_000,
    },
    arAging: aging(lastDay.ar ?? 0, [0.62, 0.21, 0.09, 0.05, 0.03]),
    apAging: aging(lastDay.ap ?? 0, [0.55, 0.27, 0.11, 0.05, 0.02]),
  };
}
