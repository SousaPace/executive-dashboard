import Image from "next/image";
import { connection } from "next/server";
import Link from "next/link";
import { mockInput } from "@/data/mock";
import { loadCurrent } from "@/data/store";
import { buildDashboard } from "@/domain/dashboard";
import { shortDate } from "@/ui/format";
import { AutoRefresh } from "./auto-refresh";
import { Carousel } from "./carousel";
import { FinanceSlide, InventorySlide, SalesSlide } from "./slides";

const TIME_ZONE = "America/Mexico_City";

/** "YYYY-MM-DD" in the given time zone. */
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

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
      // Served as-is: no image optimizer (sharp) needed on the Windows server.
      unoptimized
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
        <Link
          href="/cargar"
          className="ml-auto self-start rounded-full border border-line px-3 py-1 text-sm font-semibold text-ink-2 hover:bg-panel"
        >
          Cargar Excel
        </Link>
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
