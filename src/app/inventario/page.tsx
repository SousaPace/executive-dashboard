import type { Metadata } from "next";
import { DashboardView } from "../dashboard-view";

export const metadata: Metadata = { title: "Inventario" };

export default function InventoryPage() {
  return <DashboardView view="inventario" />;
}
