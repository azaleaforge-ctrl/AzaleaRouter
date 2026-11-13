import type { Metadata } from "next";
import { AdminUsageClient } from "@/components/admin/usage";

export const metadata: Metadata = {
  title: "Usage — Admin",
  description: "Monitoring usage demo: agregat, time series, dan request terbaru.",
};

export default function AdminUsagePage() {
  return <AdminUsageClient />;
}
