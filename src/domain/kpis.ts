/**
 * Financial KPIs (Collections, AR/AP aging, DSO, DPO, Inventory, DIO, CCC, Daily Sales, Open POs).
 * Pure arithmetic with the definitions given by Finanzas; data sources are not connected yet.
 */

export type MetricKey =
  | "collections"
  | "arAging"
  | "dso"
  | "apAging"
  | "dpo"
  | "inventory"
  | "dio"
  | "ccc"
  | "dailySales"
  | "openPos";

export type MetricUnit = "usd" | "days";

/** Which side of the plan is favorable; "neutral" = not decided, so the variance is not colored. */
export type Direction = "higher" | "lower" | "neutral";

export const METRICS: Record<
  MetricKey,
  { label: string; definition: string; unit: MetricUnit; direction: Direction }
> = {
  collections: {
    label: "Collections",
    definition: "Dinero ingresado por cobranza",
    unit: "usd",
    direction: "higher",
  },
  arAging: {
    label: "AR Aging",
    definition: "Cuentas por cobrar en dólares",
    unit: "usd",
    direction: "lower",
  },
  dso: {
    label: "DSO",
    definition: "Cuentas por cobrar en días de venta",
    unit: "days",
    direction: "lower",
  },
  apAging: {
    label: "AP Aging",
    definition: "Cuentas por pagar",
    unit: "usd",
    direction: "neutral",
  },
  dpo: {
    label: "DPO",
    definition: "Días de cuentas por pagar en dólares",
    unit: "days",
    direction: "higher",
  },
  inventory: {
    label: "Inventory",
    definition: "Total de inventario RM+WIP+FG en dólares",
    unit: "usd",
    direction: "lower",
  },
  dio: {
    label: "DIO",
    definition:
      "Días de inventario (dólares inventario total / venta diaria promedio)",
    unit: "days",
    direction: "lower",
  },
  ccc: {
    label: "CCC",
    definition: "Cash conversion cycle = DSO + DIO − DPO",
    unit: "days",
    direction: "lower",
  },
  dailySales: {
    label: "Daily Sales",
    definition: "Venta diaria",
    unit: "usd",
    direction: "higher",
  },
  openPos: {
    label: "Open PO's",
    definition: "Valor de órdenes pendientes de surtir",
    unit: "usd",
    direction: "neutral",
  },
};

/** Actual as a percentage of plan (100 = on plan); null when there is no plan to compare. */
export function pctOfPlan(
  actual: number | null,
  plan: number | null,
): number | null {
  if (actual === null || plan === null || plan === 0) return null;
  return Math.round((actual / plan) * 1000) / 10;
}

/** Balance expressed in days of an average daily amount (DSO = AR / avg daily sales, DIO = inv / avg daily sales). */
export function daysOf(balance: number, avgDaily: number): number | null {
  if (avgDaily <= 0) return null;
  return Math.round((balance / avgDaily) * 10) / 10;
}

/** CCC = DSO + DIO − DPO. */
export function cashConversionCycle(
  dso: number | null,
  dio: number | null,
  dpo: number | null,
): number | null {
  if (dso === null || dio === null || dpo === null) return null;
  return Math.round((dso + dio - dpo) * 10) / 10;
}

/** Unfavorable deviation (percentage points) still counted as "Cerca del plan". BR pending. */
export const NEAR_PLAN_POINTS = 5;

export type PlanStatus = "on" | "near" | "off";

/**
 * En plan: on the favorable side of the plan (or exactly on it).
 * Cerca del plan: unfavorable by at most NEAR_PLAN_POINTS. Fuera de plan: beyond that.
 * Undecided direction ("neutral"): distance to 100 % either way, with twice the bands.
 */
export function planStatus(
  pct: number | null,
  direction: Direction,
): PlanStatus | null {
  if (pct === null) return null;
  const dev = pct - 100;
  if (direction === "neutral") {
    const d = Math.abs(dev);
    return d <= NEAR_PLAN_POINTS
      ? "on"
      : d <= 2 * NEAR_PLAN_POINTS
        ? "near"
        : "off";
  }
  const unfavorable = direction === "higher" ? -dev : dev;
  return unfavorable <= 0
    ? "on"
    : unfavorable <= NEAR_PLAN_POINTS
      ? "near"
      : "off";
}
