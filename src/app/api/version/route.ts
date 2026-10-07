import { loadCurrent } from "@/data/store";

/** Polled by open screens: when this changes, they refresh to show the new upload. */
export async function GET() {
  const current = await loadCurrent();
  return Response.json(
    { version: current?.uploadedAt ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
