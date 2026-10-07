import type { Metadata } from "next";
import { DashboardView } from "../dashboard-view";

export const metadata: Metadata = { title: "Ventas" };

export default function SalesPage() {
  return <DashboardView view="ventas" />;
}
