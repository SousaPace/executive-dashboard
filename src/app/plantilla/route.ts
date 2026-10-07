import { buildTemplate } from "@/data/excel";

export async function GET() {
  const body = await buildTemplate();
  return new Response(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="Plantilla KPIs Capital de Trabajo.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
