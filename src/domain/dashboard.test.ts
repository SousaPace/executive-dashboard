import { describe, expect, it } from "vitest";
import { buildDashboard, type DayInput, type PlanInput } from "./dashboard";

const blankPlan: PlanInput = {
  collectionsMonth: null,
  salesMonth: null,
  salesDays: null,
  arAging: null,
  dso: null,
  apAging: null,
  dpo: null,
  inventory: null,
  dio: null,
  ccc: null,
  openPos: null,
};

const day = (date: string, v: Partial<DayInput>): DayInput => ({
  date,
  collections: null,
  ar: null,
  ap: null,
  dpo: null,
  rm: null,
  wip: null,
  fg: null,
  inventory: null,
  sales: null,
  openPos: null,
  ...v,
});

const build = (days: DayInput[], plan: Partial<PlanInput> = {}) =>
  buildDashboard(
    { days, plan: { ...blankPlan, ...plan }, arAging: null, apAging: null },
    { kind: "mock" },
  );

describe("buildDashboard", () => {
  it("sales: Day = last day, MTD = sum, Plan = month plan / sales days × days so far", () => {
    const d = build(
      [day("2026-09-28", { sales: 100 }), day("2026-09-29", { sales: 300 })],
      { salesMonth: 2000, salesDays: 20 },
    );
    expect(d.rows.dailySales).toMatchObject({
      day: 300,
      mtd: 400,
      plan: 200,
      pctVsPlan: 200,
    });
    expect(d.dailyPlan.sales).toBe(100);
  });

  it("trailing empty rows do not move the cut date", () => {
    const d = build([day("2026-09-28", { sales: 100 }), day("2026-09-29", {})]);
    expect(d.asOf).toBe("2026-09-28");
    expect(d.days).toHaveLength(1);
  });

  it("DIO = inventory / average daily sales so far; missing RM is flagged, not zero", () => {
    const d = build([
      day("2026-09-28", { sales: 100, wip: 1000, fg: 2000 }),
      day("2026-09-29", { sales: 300, wip: 1000, fg: 3000 }),
    ]);
    expect(d.series.inventory).toEqual([3000, 4000]);
    expect(d.series.dio).toEqual([30, 20]); // 3000/100, 4000/200
    expect(d.rows.inventory.note).toBe("Incompleto: sin RM");
  });

  it("missing inputs stay null all the way to the KPI", () => {
    const d = build([day("2026-09-28", { sales: 100 })]);
    expect(d.rows.collections).toMatchObject({
      day: null,
      mtd: null,
      plan: null,
      pctVsPlan: null,
    });
    expect(d.rows.dso.mtd).toBeNull();
    expect(d.rows.ccc.mtd).toBeNull();
  });

  it("CCC = DSO + DIO − DPO", () => {
    const d = build([
      day("2026-09-28", {
        sales: 100,
        ar: 3000,
        rm: 1000,
        wip: 500,
        fg: 500,
        dpo: 40,
      }),
    ]);
    expect(d.series.ccc).toEqual([30 + 20 - 40]);
  });
});
