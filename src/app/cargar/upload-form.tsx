"use client";

import Link from "next/link";
import { useActionState } from "react";
import { shortDate } from "@/ui/format";
import { uploadExcel, type UploadState } from "./actions";

export function UploadForm() {
  const [state, action, pending] = useActionState<UploadState, FormData>(
    uploadExcel,
    {
      status: "idle",
    },
  );

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-2">
            Archivo de Excel (.xlsx / .xlsm)
          </span>
          <input
            type="file"
            name="file"
            accept=".xlsx,.xlsm"
            required
            className="rounded-lg border border-line bg-bg px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-panel-2 file:px-3 file:py-1 file:font-semibold file:text-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-2">
            Contraseña de carga
          </span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-line bg-bg px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-accent px-5 py-2 font-bold text-bg disabled:opacity-60"
        >
          {pending ? "Procesando…" : "Subir y actualizar"}
        </button>
      </form>

      <div aria-live="polite">
        {state.status === "ok" && (
          <div className="rounded-lg border border-ok bg-ok/10 p-4">
            <p className="font-bold text-ok">✓ Dashboard actualizado</p>
            <p className="mt-1 text-sm">
              {state.fileName}: {state.days} días, del {shortDate(state.from)}{" "}
              al {shortDate(state.to)}.{" "}
              <Link href="/" className="font-semibold text-accent underline">
                Ver dashboard
              </Link>
            </p>
          </div>
        )}
        {state.status === "error" && (
          <div className="rounded-lg border border-bad bg-bad/10 p-4">
            <p className="font-bold text-bad">✕ No se actualizó el dashboard</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {state.status !== "idle" && state.warnings.length > 0 && (
          <div className="mt-3 rounded-lg border border-warn bg-warn/10 p-4">
            <p className="font-bold text-warn">Avisos</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
