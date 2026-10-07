import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { loadCurrent } from "@/data/store";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Cargar Excel" };

const when = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

export default async function UploadPage() {
  await connection();
  const current = await loadCurrent();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">
          Cargar Excel del día
        </h1>
        <p className="mt-1 text-ink-2">
          Sube el archivo cada mañana; las pantallas abiertas se actualizan
          solas en menos de un minuto.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-panel p-5">
        <p className="text-sm text-ink-2">
          Último archivo:{" "}
          {current ? (
            <b className="text-ink">
              {current.fileName} · {when(current.uploadedAt)}
            </b>
          ) : (
            <b className="text-ink">ninguno (se muestran datos de ejemplo)</b>
          )}
        </p>
      </section>

      <section className="rounded-xl border border-line bg-panel p-5">
        <UploadForm />
      </section>

      <section className="rounded-xl border border-line bg-panel p-5 text-sm text-ink-2">
        <h2 className="mb-2 text-base font-bold text-ink">Formato</h2>
        <p>
          Usa la plantilla: hojas <b>Diario</b>, <b>Plan</b>, <b>AR Aging</b> y{" "}
          <b>AP Aging</b>. Una fila por día hábil del mes fiscal; las celdas
          vacías se muestran como “sin dato”, nunca como 0. Si el archivo tiene
          errores no se aplica y el dashboard sigue con el anterior.
        </p>
        <a
          href="/plantilla"
          className="mt-3 inline-block rounded-lg border border-line px-4 py-2 font-semibold text-ink hover:bg-panel-2"
        >
          ⬇ Descargar plantilla
        </a>
      </section>
    </main>
  );
}
