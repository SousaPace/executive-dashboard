import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { loadCurrent } from "@/data/store";
import { Logo, uploadedText, VIEWS } from "./dashboard-view";

/** Start screen: pick what this TV shows — the rotating carousel or one fixed view. */

const ICONS: Record<string, ReactNode> = {
  todos: (
    <path
      d="M4 7h16M4 12h16M4 17h16M18 4l3 3-3 3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  finanzas: (
    <path
      d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3"
      strokeLinecap="round"
    />
  ),
  inventario: (
    <path
      d="M3 8l9-5 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8"
      strokeLinejoin="round"
    />
  ),
  ventas: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />,
};

const OPTIONS = [
  {
    href: "/todos",
    slug: "todos",
    title: "Todos",
    subtitle: "Carrusel: Finanzas → Inventario → Ventas, cambia cada 20 s",
  },
  ...VIEWS.map((v) => ({
    href: `/${v.slug}`,
    slug: v.slug,
    title: v.title,
    subtitle: v.subtitle,
  })),
];

export default async function Home() {
  await connection();
  const current = await loadCurrent();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-8 py-10">
      <header className="flex flex-col items-start gap-5">
        <Logo />
        <div>
          <h1 className="font-display text-4xl font-extrabold">
            Dashboard Ejecutivo · Capital de Trabajo
          </h1>
          <p className="mt-2 text-lg text-ink-2">
            ¿Qué quieres mostrar en esta pantalla?
          </p>
        </div>
      </header>

      <nav className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <Link
            key={o.slug}
            href={o.href}
            className="group flex items-center gap-5 rounded-2xl border border-line bg-panel p-6 transition-colors hover:border-accent hover:bg-panel-2"
          >
            <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-panel-2 text-accent group-hover:bg-bg">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                {ICONS[o.slug]}
              </svg>
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-2xl font-bold group-hover:text-accent">
                {o.title}
              </span>
              <span className="text-ink-2">{o.subtitle}</span>
            </span>
          </Link>
        ))}
      </nav>

      {/* Plain <a>: a file download, not a page navigation. */}
      <a
        href="/plantilla"
        download
        className="group flex items-center gap-5 rounded-2xl border border-accent/40 bg-accent/10 p-6 transition-colors hover:border-accent hover:bg-accent/15"
      >
        <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-accent text-bg">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
          </svg>
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-2xl font-bold">
            Descargar plantilla de Excel
          </span>
          <span className="text-ink-2">
            El formato para la carga diaria: hojas Diario, Plan, AR Aging y AP
            Aging
          </span>
        </span>
        <span className="ml-auto hidden rounded-full border border-accent/50 px-4 py-1.5 text-sm font-semibold text-accent group-hover:bg-accent group-hover:text-bg sm:inline">
          .xlsx
        </span>
      </a>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-2">
        <span>
          {current
            ? `Último Excel: ${current.fileName} · ${uploadedText(current.uploadedAt)}`
            : "Todavía no se ha cargado ningún Excel: se muestran datos de ejemplo."}
        </span>
        <Link
          href="/cargar"
          className="font-semibold text-accent hover:underline"
        >
          Cargar Excel
        </Link>
      </footer>
    </main>
  );
}
