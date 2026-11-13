import type { Metadata } from "next";
import { AdminOverviewClient } from "@/components/admin/overview";

export const metadata: Metadata = {
  title: "Overview — Admin",
  description: "Ringkasan metrik demo admin.",
};

export default function AdminOverviewPage() {
  return <AdminOverviewClient />;
}
