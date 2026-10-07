import type { Metadata } from "next";
import { DashboardView } from "../dashboard-view";

export const metadata: Metadata = { title: "Finanzas" };

export default function FinancePage() {
  return <DashboardView view="finanzas" />;
}
