import type { FinanceDashboard } from "@/domain/dashboard";
import type { MetricKey } from "@/domain/kpis";
import { AgingBars, CccBreakdown, KpiCard, MixBar, Panel } from "@/ui/cards";
import { TrendChart } from "@/ui/charts";
import { formatValue } from "@/ui/format";

type Props = { d: FinanceDashboard };

const TREND: Record<MetricKey, (d: FinanceDashboard) => (number | null)[]> = {
  collections: (d) => d.series.collections,
  arAging: (d) => d.series.ar,
  dso: (d) => d.series.dso,
  apAging: (d) => d.series.ap,
  dpo: (d) => d.series.dpo,
  inventory: (d) => d.series.inventory,
  dio: (d) => d.series.dio,
  ccc: (d) => d.series.ccc,
  dailySales: (d) => d.series.sales,
  openPos: (d) => d.series.openPos,
};

function Cards({ d, keys, cols }: Props & { keys: MetricKey[]; cols: string }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {keys.map((k) => (
        <KpiCard key={k} row={d.rows[k]} trend={TREND[k](d)} />
      ))}
    </div>
  );
}

const slide = "flex h-full flex-col gap-4";
const dates = (d: FinanceDashboard) => d.days.map((x) => x.key);
/** No plan in the Excel → no dashed line (never a line at $0). */
const planLine = (label: string, value: number | null) =>
  value === null ? undefined : { label, value };

export function FinanceSlide({ d }: Props) {
  return (
    <div className={slide}>
      <Cards
        d={d}
        keys={["collections", "arAging", "dso", "apAging", "dpo"]}
        cols="grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
      />
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[2fr_1fr_1fr]">
        <Panel
          title="Cobranza diaria"
          subtitle="Collections por día contra plan diario, USD"
        >
          <TrendChart
            dates={dates(d)}
            values={d.series.collections}
            mode="bars"
            unit="usd"
            plan={planLine("Plan diario", d.dailyPlan.collections)}
            label="Cobranza diaria contra plan diario"
          />
        </Panel>
        <Panel
          title="Antigüedad de cuentas por cobrar"
          subtitle={`AR Aging al corte · ${formatValue("usd", d.rows.arAging.day)}`}
        >
          <AgingBars buckets={d.arAging} sheet="AR Aging" />
        </Panel>
        <Panel
          title="Antigüedad de cuentas por pagar"
          subtitle={`AP Aging al corte · ${formatValue("usd", d.rows.apAging.day)}`}
        >
          <AgingBars buckets={d.apAging} sheet="AP Aging" />
        </Panel>
      </div>
    </div>
  );
}

export function InventorySlide({ d }: Props) {
  const i = d.series.inventory.length - 1;
  const { dso, dio, dpo } = d.rows;
  return (
    <div className={slide}>
      <Cards
        d={d}
        keys={["inventory", "dio", "ccc"]}
        cols="grid-cols-1 lg:grid-cols-3"
      />
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[2fr_1fr_1fr]">
        <Panel
          title="Inventario total"
          subtitle="Saldo diario RM + WIP + FG, USD"
        >
          <TrendChart
            dates={dates(d)}
            values={d.series.inventory}
            mode="area"
            unit="usd"
            plan={planLine("Plan", d.rows.inventory.plan)}
            label="Inventario total diario"
          />
        </Panel>
        <Panel
          title="Ciclo de conversión de efectivo"
          subtitle="CCC = DSO + DIO − DPO, promedio MTD"
        >
          <CccBreakdown dso={dso.mtd} dio={dio.mtd} dpo={dpo.mtd} />
        </Panel>
        <Panel
          title="Mezcla de inventario"
          subtitle="Materia prima, proceso y producto terminado"
        >
          <MixBar
            parts={[
              {
                key: "rm",
                label: "RM",
                value: d.series.rm[i] ?? null,
                color: "bg-series-1",
              },
              {
                key: "wip",
                label: "WIP",
                value: d.series.wip[i] ?? null,
                color: "bg-series-2",
              },
              {
                key: "fg",
                label: "FG",
                value: d.series.fg[i] ?? null,
                color: "bg-series-3",
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}

export function SalesSlide({ d }: Props) {
  return (
    <div className={slide}>
      <Cards
        d={d}
        keys={["dailySales", "openPos"]}
        cols="grid-cols-1 lg:grid-cols-2"
      />
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel
          title="Venta diaria"
          subtitle="Daily Sales por día contra plan diario, USD"
        >
          <TrendChart
            dates={dates(d)}
            values={d.series.sales}
            mode="bars"
            unit="usd"
            plan={planLine("Plan diario", d.dailyPlan.sales)}
            label="Venta diaria contra plan diario"
          />
        </Panel>
        <Panel
          title="Órdenes pendientes de surtir"
          subtitle="Valor diario de Open PO's, USD"
        >
          <TrendChart
            dates={dates(d)}
            values={d.series.openPos}
            mode="area"
            unit="usd"
            plan={planLine("Plan", d.rows.openPos.plan)}
            label="Valor diario de órdenes pendientes de surtir"
          />
        </Panel>
      </div>
    </div>
  );
}
