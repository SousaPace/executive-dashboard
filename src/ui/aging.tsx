import type { AgingBucket } from "@/domain/dashboard";
import { Empty } from "./cards";
import { CategoryColumns } from "./charts";

/** "1–30 días" → "1–30": the axis is already labeled as days in the panel subtitle. */
const short = (label: string) => label.replace(/\s*d[ií]as\s*$/i, "");

export function AgingColumns({
  buckets,
  sheet,
  color,
}: {
  buckets: AgingBucket[] | null;
  /** Excel sheet that feeds it, named in the empty state. */
  sheet: string;
  color: 1 | 2;
}) {
  if (!buckets) return <Empty>Sin datos en la hoja “{sheet}” del Excel.</Empty>;
  return (
    <CategoryColumns
      rows={buckets.map((b) => ({ ...b, label: short(b.label) }))}
      color={color}
      label={`${sheet} por rango de días`}
    />
  );
}
