"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { parseWorkbook } from "@/data/excel";
import { saveUpload } from "@/data/store";

export type UploadState =
  | { status: "idle" }
  | { status: "error"; errors: string[]; warnings: string[] }
  | {
      status: "ok";
      fileName: string;
      days: number;
      from: string;
      to: string;
      warnings: string[];
    };

const MAX_BYTES = 10 * 1024 * 1024;

function passwordOk(given: string): boolean {
  const expected = process.env.UPLOAD_PASSWORD ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

const fail = (...errors: string[]): UploadState => ({
  status: "error",
  errors,
  warnings: [],
});

export async function uploadExcel(
  _prev: UploadState,
  form: FormData,
): Promise<UploadState> {
  if (!process.env.UPLOAD_PASSWORD)
    return fail(
      "La carga está deshabilitada: falta configurar UPLOAD_PASSWORD en el servidor.",
    );
  if (!passwordOk(String(form.get("password") ?? "")))
    return fail("Contraseña incorrecta.");

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return fail("Selecciona un archivo de Excel.");
  if (!/\.(xlsx|xlsm)$/i.test(file.name))
    return fail("El archivo debe ser .xlsx o .xlsm.");
  if (file.size > MAX_BYTES) return fail("El archivo pesa más de 10 MB.");

  const data = await file.arrayBuffer();
  const { input, errors, warnings } = await parseWorkbook(data);
  if (!input) return { status: "error", errors, warnings };

  await saveUpload(data, {
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
    warnings,
    input,
  });
  revalidatePath("/");

  const dates = input.days.map((d) => d.date).sort();
  return {
    status: "ok",
    fileName: file.name,
    days: dates.length,
    from: dates[0],
    to: dates[dates.length - 1],
    warnings,
  };
}
