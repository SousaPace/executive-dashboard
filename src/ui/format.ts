/** Shared by server and client components: same text on both sides. */

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumSignificantDigits: 3,
});

export type Unit = "usd" | "days";

export const usd = (n: number) => compactUsd.format(n);
export const daysText = (n: number) => `${Math.round(n)} días`;
export const pct = (n: number) => `${n.toFixed(1)}%`;
export const formatValue = (unit: Unit, n: number | null) =>
  n === null ? "—" : unit === "usd" ? usd(n) : daysText(n);

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "2026-09-15" → "15 sep". */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
