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
    expect(errors[0]).toContain('Falta la hoja "Diario"');
  });

  it("rejects something that is not an Excel file", async () => {
    const { errors } = await parseWorkbook(
      new TextEncoder().encode("hola").buffer as ArrayBuffer,
    );
    expect(errors[0]).toContain("No pude abrir el archivo");
  });
});
