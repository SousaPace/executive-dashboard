import type { Metadata } from "next";
import { DashboardView } from "../dashboard-view";

export const metadata: Metadata = { title: "Todos" };

export default function AllViewsPage() {
  return <DashboardView view="todos" />;
}
