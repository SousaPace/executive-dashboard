import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildTemplate, parseWorkbook } from "./excel";

async function workbook(
  fill: (wb: ExcelJS.Workbook) => void,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  fill(wb);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

describe("parseWorkbook", () => {
  it("reads the template filled in: dates, numbers, blanks as null, plan and aging", async () => {
    const tpl = new ExcelJS.Workbook();
    await tpl.xlsx.load(await buildTemplate());
    const daily = tpl.getWorksheet("Diario")!;
    daily.addRow([
      new Date(Date.UTC(2026, 8, 28)),
      null,
      null,
      null,
      null,
      null,
      1445072.53,
      2580285.95,
      203450.34,
      null,
    ]);
    daily.addRow([
      "29/09/2026",
      null,
      "",
      null,
      null,
      null,
      1537941.21,
      2463159.95,
      "$108,042.68",
      null,
    ]);
    tpl.getWorksheet("Plan")!.getCell("B3").value = 4103000; // Venta del mes
    tpl.getWorksheet("Plan")!.getCell("B4").value = 20; // Días de venta
    tpl.getWorksheet("AR Aging")!.getCell("B2").value = 1000;

    const { input, errors, warnings } = await parseWorkbook(
      (await tpl.xlsx.writeBuffer()) as ArrayBuffer,
    );
    expect(errors).toEqual([]);
    expect(input!.days).toEqual([
      {
        date: "2026-09-28",
        collections: null,
        ar: null,
        ap: null,
        dpo: null,
        rm: null,
        wip: 1445072.53,
        fg: 2580285.95,
        inventory: null,
        sales: 203450.34,
        openPos: null,
      },
      {
        date: "2026-09-29",
        collections: null,
        ar: null,
        ap: null,
        dpo: null,
        rm: null,
        wip: 1537941.21,
        fg: 2463159.95,
        inventory: null,
        sales: 108042.68,
        openPos: null,
      },
    ]);
    expect(input!.plan.salesMonth).toBe(4103000);
    expect(input!.plan.salesDays).toBe(20);
    expect(input!.plan.dso).toBeNull();
    expect(input!.arAging).toEqual([
      { key: "Corriente", label: "Corriente", value: 1000 },
    ]);
    expect(input!.apAging).toBeNull();
    expect(warnings.some((w) => w.includes("AP Aging"))).toBe(true);
  });

  it("uses the cached result of formula cells", async () => {
    const data = await workbook((wb) => {
      const ws = wb.addWorksheet("Diario");
      ws.addRow(["Fecha", "Venta diaria"]);
      ws.addRow(["01/10/2026", { formula: "100+200", result: 300 }]);
    });
    const { input } = await parseWorkbook(data);
    expect(input!.days[0].sales).toBe(300);
  });

  it("rejects the file with sheet, row and column of every problem", async () => {
    const data = await workbook((wb) => {
      const ws = wb.addWorksheet("Diario");
      ws.addRow(["Fecha", "Venta diaria"]);
      ws.addRow(["01/10/2026", "mucho"]);
      ws.addRow(["01/10/2026", 5]);
      ws.addRow([null, 7]);
      ws.addRow(["31/02/2026", 1]);
    });
    const { input, errors } = await parseWorkbook(data);
    expect(input).toBeNull();
    expect(errors).toEqual([
      'Hoja "Diario", fila 2, columna Venta diaria: "mucho" no es un número.',
      'Hoja "Diario", fila 3: la fecha 2026-10-01 ya aparece en la fila 2.',
      'Hoja "Diario", fila 4: tiene datos pero no tiene fecha.',
      'Hoja "Diario", fila 5, columna Fecha: "31/02/2026" no es una fecha (usa DD/MM/AAAA).',
    ]);
  });

  it("explains a missing Diario sheet", async () => {
    const data = await workbook((wb) => wb.addWorksheet("Hoja1"));
    const { errors } = await parseWorkbook(data);
    expect(errors[0]).toContain('la hoja "Diario" de la plantilla');
  });

  it("rejects something that is not an Excel file", async () => {
    const { errors } = await parseWorkbook(
      new TextEncoder().encode("hola").buffer as ArrayBuffer,
    );
    expect(errors[0]).toContain("No pude abrir el archivo");
  });
});

/** Replica of the finance team's sheet: KPIs in rows, one column per day, then MTD/%/Plan. */
async function financeSheet(shifted: boolean): Promise<ArrayBuffer> {
  const d = (m: number, day: number) => new Date(Date.UTC(2026, m - 1, day));
  const dates = [d(9, 28), d(9, 29), d(9, 30), d(10, 1), d(10, 2), d(10, 5)];
  return workbook((wb) => {
    const ws = wb.addWorksheet("Hoja1");
    // As sent: the first date sits above the KPI names, so every date is one column to the left.
    ws.addRow(
      shifted
        ? [...dates, "MTD", "% Vs Plan", "Plan", "Definicion"]
        : [null, ...dates, "MTD", "% Vs Plan", "Plan", "Definicion"],
    );
    const err = { error: "#VALUE!" };
    ws.addRow([
      "Collections",
      252372.93,
      100097.84,
      0,
      366210.47,
      105300.96,
      59593.16,
      null,
      err,
      null,
      "Dinero ingresado por cobranza",
    ]);
    ws.addRow([
      "AR Aging",
      5030576.28,
      5030576.28,
      5030576.28,
      5030576.28,
      5030576.28,
      5030576.28,
      null,
      err,
    ]);
    ws.addRow([
      "DSO",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      { error: "#DIV/0!" },
    ]);
    ws.addRow([
      "AP Aging",
      5472276.5,
      5472276.5,
      5632440.5,
      5467466.54,
      5632440.5,
      5449606.32,
      null,
      err,
    ]);
    ws.addRow(["DPO"]);
    ws.addRow([
      "Inventory",
      4025358.48,
      4001101.16,
      4095639.05,
      4065597.68,
      4288411.7,
      4288411.7,
      null,
      0.9973,
      4300000,
    ]);
    ws.addRow(["DIO", 20, 37, 69, 23, 43, 43, null, 1, 43]);
    ws.addRow(["CCC"]);
    ws.addRow([]);
    ws.addRow([
      "Daily Sales",
      203450.34,
      108042.68,
      59539.98,
      175042.45,
      98920.94,
      230128.02,
      null,
      0.07,
      3500000,
    ]);
    ws.addRow([
      "Open PO´s",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      747000,
    ]);
  });
}

describe("parseWorkbook — KPIs in rows, dates in columns", () => {
  it("rejects dates shifted one column to the left, saying where", async () => {
    const { input, errors } = await parseWorkbook(await financeSheet(true));
    expect(input).toBeNull();
    expect(errors[0]).toContain("celda A1");
    expect(errors[0]).toContain("recorridas una columna a la izquierda");
  });

  it("reads the corrected sheet: days, plan column, recomputes DIO, ignores MTD and % vs Plan", async () => {
    const { input, errors, warnings } = await parseWorkbook(
      await financeSheet(false),
    );
    expect(errors).toEqual([]);
    expect(input!.days.map((x) => x.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-05",
    ]);
    expect(input!.days[0]).toMatchObject({
      collections: 252372.93,
      inventory: 4025358.48,
      sales: 203450.34,
      dpo: null,
      openPos: null,
    });
    expect(input!.days[2].collections).toBe(0); // "$ -" in accounting format is a real 0
    expect(input!.plan).toMatchObject({
      inventory: 4300000,
      dio: 43,
      salesMonth: 3500000,
      openPos: 747000,
      salesDays: null,
    });
    expect(
      warnings.some(
        (w) =>
          w.includes("DIO se recalcula") || w.includes("DIO se recalculan"),
      ),
    ).toBe(true);
    expect(warnings.some((w) => w.includes("Días de venta del mes"))).toBe(
      true,
    );
  });
});
