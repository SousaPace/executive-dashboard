import Image from "next/image";
import { connection } from "next/server";
import { getFinanceDashboard } from "@/data/mock";
import { NEAR_PLAN_POINTS } from "@/domain/kpis";
import { shortDate } from "@/ui/format";
import { Carousel } from "./carousel";
import { FinanceSlide, InventorySlide, SalesSlide } from "./slides";

const TIME_ZONE = "America/Mexico_City";

/** "YYYY-MM-DD" in the given time zone. */
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

const NOTES: {
  tag: "DATA GAP" | "REGLA PENDIENTE" | "CÁLCULO";
  title: string;
  body: string;
}[] = [
  {
    tag: "DATA GAP",
    title: "Sin fuente de datos",
    body: "Cobranza, CxC, CxP, inventario valorizado (RM/WIP/FG), ventas, órdenes abiertas y planes no están conectados: todos los valores son simulados.",
  },
  {
    tag: "CÁLCULO",
    title: "Day · MTD · Plan",
    body: "Collections y Daily Sales: Day = el día, MTD = suma del mes, Plan = plan acumulado a la fecha. Saldos y días (AR, AP, Inventory, Open PO's, DSO, DPO, DIO, CCC): Day = cierre del día, MTD = promedio de los días hábiles del mes. % vs Plan = MTD / Plan.",
  },
  {
    tag: "CÁLCULO",
    title: "Fórmulas",
    body: "DSO = AR / venta diaria promedio. DIO = inventario total (RM+WIP+FG) / venta diaria promedio. CCC = DSO + DIO − DPO.",
  },
  {
    tag: "REGLA PENDIENTE",
    title: "En plan · Cerca · Fuera",
    body: `En plan = del lado favorable del plan; Cerca = hasta ${NEAR_PLAN_POINTS} puntos desfavorables; Fuera = más. AP Aging y Open PO's (dirección sin definir): ±${NEAR_PLAN_POINTS} pts en plan, ±${2 * NEAR_PLAN_POINTS} cerca. Confirmar umbrales y dirección.`,
  },
  {
    tag: "REGLA PENDIENTE",
    title: "Venta diaria promedio",
    body: "Falta definir la ventana (mes en curso, últimos 30/90 días) y si cuenta días hábiles o naturales. Mock: días hábiles del mes en curso.",
  },
  {
    tag: "REGLA PENDIENTE",
    title: "Fórmula de DPO",
    body: "Falta definir el denominador (compras diarias promedio o costo de ventas). Mock: DPO simulado directamente.",
  },
];

/** Official logo, light version for the dark theme (original: public/brand/orion-castings.png). */
function Logo() {
  return (
    <Image
      src="/brand/orion-castings-light.png"
      alt="Orion Castings"
      width={552}
      height={122}
      loading="eager"
      className="h-auto w-56 shrink-0"
    />
  );
}

const VIEWS = [
  {
    slug: "finanzas",
    title: "Finanzas",
    subtitle: "Collections · AR · DSO · AP · DPO",
  },
  {
    slug: "inventario",
    title: "Inventario",
    subtitle: "Inventory · DIO · CCC",
  },
  { slug: "ventas", title: "Ventas", subtitle: "Daily Sales · Open PO's" },
];

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { vista } = await searchParams;
  await connection(); // mock data depends on today's date: render per request
  const d = getFinanceDashboard(todayIn(TIME_ZONE));
  return (
    <main className="flex min-h-screen flex-col gap-4 px-8 py-5 xl:h-screen">
      <header className="flex items-center gap-10">
        <Logo />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[2.1rem] leading-none font-extrabold">
            Dashboard Ejecutivo · Capital de Trabajo
          </h1>
          <div className="flex items-center gap-4 text-ink-2">
            <span className="rounded-full border border-line px-3 py-0.5 text-xs font-bold tracking-wider text-ink uppercase">
              Datos de ejemplo
            </span>
            <span>Corte: {shortDate(d.asOf)}</span>
          </div>
        </div>
        <details className="relative ml-auto self-start">
          <summary className="cursor-pointer list-none rounded-full border border-line px-3 py-1 text-sm font-semibold text-ink-2 hover:bg-panel">
            Notas ({NOTES.length})
          </summary>
          <ul className="absolute right-0 z-20 mt-2 flex w-[32rem] flex-col gap-3 rounded-xl border border-line bg-panel-2 p-4 text-sm shadow-2xl">
            {NOTES.map((n) => (
              <li key={n.title}>
                <span
                  className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-black ${
                    n.tag === "DATA GAP"
                      ? "bg-warn text-bg"
                      : n.tag === "REGLA PENDIENTE"
                        ? "bg-accent text-bg"
                        : "bg-line text-ink"
                  }`}
                >
                  {n.tag}
                </span>
                <b>{n.title}.</b> <span className="text-ink-2">{n.body}</span>
              </li>
            ))}
          </ul>
        </details>
      </header>
      <Carousel
        views={VIEWS}
        initial={Math.max(
          VIEWS.findIndex((v) => v.slug === vista),
          0,
        )}
      >
        <FinanceSlide d={d} />
        <InventorySlide d={d} />
        <SalesSlide d={d} />
      </Carousel>
    </main>
  );
}
