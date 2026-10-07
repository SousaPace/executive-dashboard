import ExcelJS from "exceljs";
import type {
  AgingBucket,
  DashboardInput,
  DayInput,
  PlanInput,
} from "@/domain/dashboard";
import { AGING_BUCKETS } from "./mock";

/**
 * The morning upload: one workbook in a fixed template (download it from /plantilla).
 * Headers are matched ignoring case, accents and spaces. Blank cells stay blank (null) — they are
 * never read as 0. Anything that cannot be read is reported with sheet, row and column, and the
 * file is rejected so the screen never shows half-read data.
 */

export const SHEETS = {
  daily: "Diario",
  plan: "Plan",
  arAging: "AR Aging",
  apAging: "AP Aging",
  help: "Instrucciones",
} as const;

type DayField = Exclude<keyof DayInput, "date">;

export const DAILY_COLUMNS: {
  field: "date" | DayField;
  header: string;
  aliases: string[];
  hint: string;
}[] = [
  {
    field: "date",
    header: "Fecha",
    aliases: ["fecha", "date", "dia", "day"],
    hint: "Día hábil del mes fiscal",
  },
  {
    field: "collections",
    header: "Collections",
    aliases: ["collections", "cobranza"],
    hint: "Dinero ingresado por cobranza en el día (USD)",
  },
  {
    field: "ar",
    header: "AR",
    aliases: ["ar", "araging", "cxc", "cuentasporcobrar"],
    hint: "Saldo de cuentas por cobrar al cierre del día (USD)",
  },
  {
    field: "ap",
    header: "AP",
    aliases: ["ap", "apaging", "cxp", "cuentasporpagar"],
    hint: "Saldo de cuentas por pagar al cierre del día (USD)",
  },
  {
    field: "dpo",
    header: "DPO (días)",
    aliases: ["dpo", "dpodias"],
    hint: "Días de cuentas por pagar (ya calculado)",
  },
  {
    field: "rm",
    header: "Inventario RM",
    aliases: ["inventariorm", "rm", "materiaprima"],
    hint: "Materia prima (USD)",
  },
  {
    field: "wip",
    header: "Inventario WIP",
    aliases: ["inventariowip", "wip"],
    hint: "Phin90: subtotal WIP de Ext. Total Cost (USD)",
  },
  {
    field: "fg",
    header: "Inventario FG",
    aliases: ["inventariofg", "fg", "productoterminado"],
    hint: "Phin90: total − WIP de Ext. Total Cost (USD)",
  },
  {
    field: "sales",
    header: "Venta diaria",
    aliases: ["ventadiaria", "dailysales", "venta", "ventas"],
    hint: "Daily Product Sales Total del día (USD)",
  },
  {
    field: "openPos",
    header: "Open POs",
    aliases: ["openpos", "openpo", "ordenesabiertas", "ordenespendientes"],
    hint: "Valor de órdenes pendientes de surtir al cierre del día (USD)",
  },
];

export const PLAN_ROWS: {
  field: keyof PlanInput;
  label: string;
  aliases: string[];
}[] = [
  {
    field: "collectionsMonth",
    label: "Collections del mes",
    aliases: ["collectionsdelmes", "collections", "cobranzadelmes"],
  },
  {
    field: "salesMonth",
    label: "Venta del mes (Budget)",
    aliases: ["ventadelmesbudget", "ventadelmes", "budget", "venta"],
  },
  {
    field: "salesDays",
    label: "Días de venta del mes",
    aliases: ["diasdeventadelmes", "diasdeventa", "salesdays"],
  },
  { field: "arAging", label: "AR Aging", aliases: ["araging", "ar"] },
  { field: "dso", label: "DSO (días)", aliases: ["dsodias", "dso"] },
  { field: "apAging", label: "AP Aging", aliases: ["apaging", "ap"] },
  { field: "dpo", label: "DPO (días)", aliases: ["dpodias", "dpo"] },
  {
    field: "inventory",
    label: "Inventory",
    aliases: ["inventory", "inventario"],
  },
  { field: "dio", label: "DIO (días)", aliases: ["diodias", "dio"] },
  { field: "ccc", label: "CCC (días)", aliases: ["cccdias", "ccc"] },
  { field: "openPos", label: "Open POs", aliases: ["openpos", "openpo"] },
];

export type ParseResult = {
  input: DashboardInput | null;
  errors: string[];
  warnings: string[];
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Plain value of an ExcelJS cell: formulas give their cached result. */
function plain(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v !== "object") return v;
  if ("result" in v) return plain(v.result as ExcelJS.CellValue);
  if ("richText" in v) return v.richText.map((t) => t.text).join("");
  if ("text" in v) return String(v.text);
  if ("error" in v) return { error: v.error };
  return null;
}

const isBlank = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "");

function toNumber(v: unknown): number | null | "invalid" {
  if (isBlank(v)) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : "invalid";
  if (typeof v === "string") {
    let s = v.trim().replace(/[$\s,]/g, "");
    if (s === "-") return null;
    const neg = /^\(.*\)$/.test(s);
    if (neg) s = s.slice(1, -1);
    if (!/^-?\d+(\.\d+)?$/.test(s)) return "invalid";
    return neg ? -Number(s) : Number(s);
  }
  return "invalid";
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
    ? `${y}-${pad(m)}-${pad(d)}`
    : null;
};

/** Excel date, serial number, "AAAA-MM-DD" or "DD/MM/AAAA" (Mexican order). */
function toDate(v: unknown): string | null | "invalid" {
  if (isBlank(v)) return null;
  if (v instanceof Date)
    return (
      iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate()) ?? "invalid"
    );
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
    return (
      iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()) ??
      "invalid"
    );
  }
  if (typeof v === "string") {
    const s = v.trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (m) return iso(+m[1], +m[2], +m[3]) ?? "invalid";
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
    if (m)
      return (
        iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]) ?? "invalid"
      );
  }
  return "invalid";
}

const show = (v: unknown) =>
  typeof v === "object" && v !== null && "error" in v
    ? String((v as { error: string }).error)
    : `"${String(v)}"`;

function findSheet(wb: ExcelJS.Workbook, name: string) {
  return wb.worksheets.find((ws) => norm(ws.name) === norm(name)) ?? null;
}

function readDaily(
  ws: ExcelJS.Worksheet,
  errors: string[],
  warnings: string[],
): DayInput[] {
  // Header = first row (of the first 10) that has a "Fecha" column.
  let headerRow = 0;
  const colOf = new Map<string, number>();
  for (let r = 1; r <= Math.min(10, ws.rowCount) && !headerRow; r++) {
    ws.getRow(r).eachCell((cell, c) => {
      const h = norm(String(plain(cell.value) ?? ""));
      const col = DAILY_COLUMNS.find((d) => d.aliases.includes(h));
      if (col && !colOf.has(col.field)) colOf.set(col.field, c);
    });
    if (colOf.has("date")) headerRow = r;
    else colOf.clear();
  }
  if (!headerRow) {
    errors.push(
      `Hoja "${ws.name}": no encontré la columna "Fecha" en los encabezados.`,
    );
    return [];
  }
  for (const c of DAILY_COLUMNS) {
    if (!colOf.has(c.field))
      warnings.push(
        `Hoja "${ws.name}": falta la columna "${c.header}"; ese dato se mostrará sin datos.`,
      );
  }

  const days: DayInput[] = [];
  const seen = new Map<string, number>();
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const raw = (field: string) => {
      const c = colOf.get(field);
      return c ? plain(row.getCell(c).value) : null;
    };
    const values = DAILY_COLUMNS.filter((c) => c.field !== "date").map(
      (c) => [c, raw(c.field)] as const,
    );
    const dateRaw = raw("date");
    if (isBlank(dateRaw) && values.every(([, v]) => isBlank(v))) continue;

    const date = toDate(dateRaw);
    if (date === null) {
      errors.push(
        `Hoja "${ws.name}", fila ${r}: tiene datos pero no tiene fecha.`,
      );
      continue;
    }
    if (date === "invalid") {
      errors.push(
        `Hoja "${ws.name}", fila ${r}, columna Fecha: ${show(dateRaw)} no es una fecha (usa DD/MM/AAAA).`,
      );
      continue;
    }
    if (seen.has(date)) {
      errors.push(
        `Hoja "${ws.name}", fila ${r}: la fecha ${date} ya aparece en la fila ${seen.get(date)}.`,
      );
      continue;
    }
    seen.set(date, r);

    const day = { date } as DayInput;
    for (const [c, v] of values) {
      const n = toNumber(v);
      if (n === "invalid") {
        errors.push(
          `Hoja "${ws.name}", fila ${r}, columna ${c.header}: ${show(v)} no es un número.`,
        );
        day[c.field as DayField] = null;
      } else day[c.field as DayField] = n;
    }
    days.push(day);
  }
  if (!days.length)
    errors.push(`Hoja "${ws.name}": no tiene ninguna fila con datos.`);

  const dates = days.map((d) => d.date).sort();
  if (dates.length > 1) {
    const span =
      (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86_400_000;
    if (span > 45)
      warnings.push(
        `Hoja "${ws.name}": las fechas abarcan ${Math.round(span)} días; el dashboard asume un solo mes fiscal.`,
      );
  }
  return days;
}

function readPlan(
  ws: ExcelJS.Worksheet | null,
  errors: string[],
  warnings: string[],
): PlanInput {
  const plan = Object.fromEntries(
    PLAN_ROWS.map((p) => [p.field, null]),
  ) as PlanInput;
  if (!ws) {
    warnings.push(`Falta la hoja "${SHEETS.plan}": ningún KPI tendrá plan.`);
    return plan;
  }
  ws.eachRow((row, r) => {
    const label = norm(String(plain(row.getCell(1).value) ?? ""));
    if (!label || label === "concepto") return;
    const p = PLAN_ROWS.find((x) => x.aliases.includes(label));
    if (!p) {
      warnings.push(
        `Hoja "${ws.name}", fila ${r}: no reconozco el concepto "${plain(row.getCell(1).value)}"; se ignora.`,
      );
      return;
    }
    const v = plain(row.getCell(2).value);
    const n = toNumber(v);
    if (n === "invalid")
      errors.push(
        `Hoja "${ws.name}", fila ${r} (${p.label}): ${show(v)} no es un número.`,
      );
    else plan[p.field] = n;
  });
  if (plan.salesDays !== null && plan.salesDays <= 0)
    errors.push(
      `Hoja "${ws.name}": "Días de venta del mes" debe ser mayor que 0.`,
    );
  return plan;
}

function readAging(
  ws: ExcelJS.Worksheet | null,
  name: string,
  errors: string[],
  warnings: string[],
): AgingBucket[] | null {
  if (!ws) {
    warnings.push(
      `Falta la hoja "${name}": la gráfica de antigüedad se mostrará sin datos.`,
    );
    return null;
  }
  const buckets: AgingBucket[] = [];
  ws.eachRow((row, r) => {
    const label = String(plain(row.getCell(1).value) ?? "").trim();
    if (!label || norm(label) === "rango") return;
    const v = plain(row.getCell(2).value);
    const n = toNumber(v);
    if (n === "invalid")
      errors.push(
        `Hoja "${ws.name}", fila ${r} (${label}): ${show(v)} no es un número.`,
      );
    else if (n !== null) buckets.push({ key: label, label, value: n });
  });
  if (!buckets.length) {
    warnings.push(
      `Hoja "${ws.name}": no tiene montos; la gráfica de antigüedad se mostrará sin datos.`,
    );
    return null;
  }
  return buckets;
}

export async function parseWorkbook(data: ArrayBuffer): Promise<ParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data);
  } catch {
    return {
      input: null,
      errors: ["No pude abrir el archivo: debe ser un Excel .xlsx o .xlsm."],
      warnings,
    };
  }
  const daily = findSheet(wb, SHEETS.daily);
  if (!daily) {
    const names = wb.worksheets.map((w) => `"${w.name}"`).join(", ");
    return {
      input: null,
      errors: [
        `Falta la hoja "${SHEETS.daily}". Hojas encontradas: ${names}. Descarga la plantilla.`,
      ],
      warnings,
    };
  }
  const days = readDaily(daily, errors, warnings);
  const plan = readPlan(findSheet(wb, SHEETS.plan), errors, warnings);
  const arAging = readAging(
    findSheet(wb, SHEETS.arAging),
    SHEETS.arAging,
    errors,
    warnings,
  );
  const apAging = readAging(
    findSheet(wb, SHEETS.apAging),
    SHEETS.apAging,
    errors,
    warnings,
  );
  return errors.length
    ? { input: null, errors, warnings }
    : { input: { days, plan, arAging, apAging }, errors, warnings };
}

/** Empty template with the exact sheets and headers the parser expects. */
export async function buildTemplate(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const head = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.eachCell((c) => {
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF12324F" },
      };
    });
  };
  const usd = '"$"#,##0';

  const help = wb.addWorksheet(SHEETS.help);
  help.columns = [{ width: 24 }, { width: 90 }];
  help.addRows([
    ["Dashboard Ejecutivo · Capital de Trabajo", ""],
    ["", ""],
    [
      "Cómo usar",
      "Llena las hojas y súbelo cada mañana en /cargar. El dashboard se actualiza solo.",
    ],
    [
      "Diario",
      "Una fila por día hábil del mes fiscal. Celdas vacías = sin dato (nunca se toman como 0).",
    ],
    [
      "Plan",
      "Metas del mes. Collections y Venta: total del mes; se reparten entre los días de venta.",
    ],
    [
      "AR Aging / AP Aging",
      "Saldo por rango de antigüedad al día de corte (USD).",
    ],
    ["Fechas", "Usa fechas de Excel o texto DD/MM/AAAA."],
    ["", ""],
    ["Columna (Diario)", "Qué poner"],
    ...DAILY_COLUMNS.map((c) => [c.header, c.hint]),
  ]);
  help.getRow(1).font = { bold: true, size: 14 };
  head(help.getRow(9));

  const daily = wb.addWorksheet(SHEETS.daily, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  daily.columns = DAILY_COLUMNS.map((c) => ({
    header: c.header,
    key: c.field,
    width: c.field === "date" ? 13 : 17,
    style: {
      numFmt:
        c.field === "date" ? "dd/mm/yyyy" : c.field === "dpo" ? "0.0" : usd,
    },
  }));
  head(daily.getRow(1));

  const plan = wb.addWorksheet(SHEETS.plan);
  plan.columns = [
    { header: "Concepto", width: 28 },
    { header: "Valor", width: 18 },
  ];
  PLAN_ROWS.forEach((p) => plan.addRow([p.label, null]));
  head(plan.getRow(1));
  plan.getColumn(2).numFmt = "#,##0.0";

  for (const name of [SHEETS.arAging, SHEETS.apAging]) {
    const ws = wb.addWorksheet(name);
    ws.columns = [
      { header: "Rango", width: 18 },
      { header: "Monto", width: 18, style: { numFmt: usd } },
    ];
    AGING_BUCKETS.forEach((b) => ws.addRow([b, null]));
    head(ws.getRow(1));
  }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
