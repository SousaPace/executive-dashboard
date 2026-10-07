import { describe, expect, it } from "vitest";
import { cashConversionCycle, daysOf, pctOfPlan, planStatus } from "./kpis";

describe("financial KPIs", () => {
  it("pctOfPlan is actual / plan as a percentage, null without a plan", () => {
    expect(pctOfPlan(95, 100)).toBe(95);
    expect(pctOfPlan(1234, 1000)).toBe(123.4);
    expect(pctOfPlan(10, 0)).toBeNull();
    expect(pctOfPlan(null, 100)).toBeNull();
  });

  it("daysOf divides a balance by the average daily amount", () => {
    expect(daysOf(12_000_000, 400_000)).toBe(30);
    expect(daysOf(1_000, 0)).toBeNull();
  });

  it("CCC = DSO + DIO − DPO", () => {
    expect(cashConversionCycle(30, 28, 45)).toBe(13);
    expect(cashConversionCycle(30, null, 45)).toBeNull();
  });

  it("planStatus: favorable side = en plan, ≤ 5 pts unfavorable = cerca, beyond = fuera", () => {
    expect(planStatus(104.1, "higher")).toBe("on");
    expect(planStatus(97, "higher")).toBe("near");
    expect(planStatus(90, "higher")).toBe("off");
    expect(planStatus(101, "lower")).toBe("near");
    expect(planStatus(170.8, "lower")).toBe("off");
    expect(planStatus(92, "lower")).toBe("on");
    expect(planStatus(98.6, "neutral")).toBe("on");
    expect(planStatus(108, "neutral")).toBe("near");
    expect(planStatus(null, "higher")).toBeNull();
  });
});
