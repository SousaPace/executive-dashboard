import Image from "next/image";
import { connection } from "next/server";
import Link from "next/link";
import { mockInput } from "@/data/mock";
import { loadCurrent } from "@/data/store";
import { buildDashboard } from "@/domain/dashboard";
import { NEAR_PLAN_POINTS } from "@/domain/kpis";
import { shortDate } from "@/ui/format";
import { AutoRefresh } from "./auto-refresh";
import { Carousel } from "./carousel";
import { FinanceSlide, InventorySlide, SalesSlide } from "./slides";

const TIME_ZONE = "America/Mexico_City";

/** "YYYY-MM-DD" in the given time zone. */
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

type Note = {
  tag: "DATA GAP" | "REGLA PENDIENTE" | "CÁLCULO" | "AVISO";
  title: string;
  body: string;
};

const MOCK_NOTE: Note = {
  tag: "DATA GAP",
  title: "Sin Excel cargado",
  body: "Todavía no se ha subido ningún archivo en /cargar: todos los valores son simulados.",
};

const NOTES: Note[] = [
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
    body: "Falta definir la ventana (mes en curso, últimos 30/90 días). Hoy: promedio de la venta diaria de los días del Excel, como la columna Average del Daily Sales Report.",
  },
  {
    tag: "REGLA PENDIENTE",
    title: "Fórmula de DPO",
    body: 'Falta definir el denominador (compras diarias promedio o costo de ventas). Por ahora el DPO se toma tal cual de la columna "DPO (días)" del Excel.',
  },
];

export const uploadedText = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

/** Official logo, light version for the dark theme (original: public/brand/orion-castings.png). */
export function Logo() {
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

export const VIEWS = [
  {
    slug: "finanzas",
    title: "Finanzas",
    subtitle: "Collections · AR · DSO · AP · DPO",
    Slide: FinanceSlide,
  },
  {
    slug: "inventario",
    title: "Inventario",
    subtitle: "Inventory · DIO · CCC",
    Slide: InventorySlide,
  },
  {
    slug: "ventas",
    title: "Ventas",
    subtitle: "Daily Sales · Open PO's",
    Slide: SalesSlide,
  },
] as const;

export type ViewSlug = (typeof VIEWS)[number]["slug"];

/**
 * One TV screen: every view in the carousel ("todos"), or a single fixed view so each TV can
 * show a different one.
 */
export async function DashboardView({ view }: { view: "todos" | ViewSlug }) {
  await connection(); // reads the latest upload (or today's mock) on every request
  const stored = await loadCurrent();
  const d = stored
    ? buildDashboard(stored.input, {
        kind: "excel",
        fileName: stored.fileName,
        uploadedAt: stored.uploadedAt,
        warnings: stored.warnings,
      })
    : buildDashboard(mockInput(todayIn(TIME_ZONE)), { kind: "mock" });
  const single = VIEWS.find((v) => v.slug === view);
  const notes: Note[] = [
    ...(stored
      ? stored.warnings.map((w) => ({
          tag: "AVISO" as const,
          title: "Excel",
          body: w,
        }))
      : [MOCK_NOTE]),
    ...NOTES,
  ];
  return (
    <main className="flex min-h-screen flex-col gap-4 px-8 py-5 xl:h-screen">
      <header className="flex items-center gap-10">
        <Link href="/" aria-label="Inicio" className="shrink-0">
          <Logo />
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[2.1rem] leading-none font-extrabold">
            Dashboard Ejecutivo · {single ? single.title : "Capital de Trabajo"}
          </h1>
          <div className="flex items-center gap-4 text-ink-2">
            <span className="rounded-full border border-line px-3 py-0.5 text-xs font-bold tracking-wider text-ink uppercase">
              {stored ? "Excel importado" : "Datos de ejemplo"}
            </span>
            <span>Corte: {d.asOf ? shortDate(d.asOf) : "sin datos"}</span>
            {stored && (
              <span className="text-sm text-ink-3">
                Actualizado {uploadedText(stored.uploadedAt)}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 self-start">
          <Link
            href="/cargar"
            className="rounded-full border border-line px-3 py-1 text-sm font-semibold text-ink-2 hover:bg-panel"
          >
            Cargar Excel
          </Link>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-full border border-line px-3 py-1 text-sm font-semibold text-ink-2 hover:bg-panel">
              Notas ({notes.length})
            </summary>
            <ul className="absolute right-0 z-20 mt-2 flex w-[32rem] flex-col gap-3 rounded-xl border border-line bg-panel-2 p-4 text-sm shadow-2xl">
              {notes.map((n) => (
                <li key={`${n.tag}-${n.title}-${n.body}`}>
                  <span
                    className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-black ${
                      n.tag === "DATA GAP" || n.tag === "AVISO"
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
        </div>
      </header>
      <AutoRefresh version={stored?.uploadedAt ?? null} />
      {single ? (
        <div className="-m-1 min-h-0 flex-1 p-1">
          <single.Slide d={d} />
        </div>
      ) : (
        <Carousel
          views={VIEWS.map(({ title, subtitle }) => ({ title, subtitle }))}
        >
          {VIEWS.map(({ slug, Slide }) => (
            <Slide key={slug} d={d} />
          ))}
        </Carousel>
      )}
    </main>
  );
}
