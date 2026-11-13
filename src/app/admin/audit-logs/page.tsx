import type { Metadata } from "next";
import { AdminAuditLogsClient } from "@/components/admin/audit-logs";

export const metadata: Metadata = {
  title: "Audit Logs — Admin",
  description: "Jejak perubahan penting pada demo (data audit demo).",
};

export default function AdminAuditLogsPage() {
  return <AdminAuditLogsClient />;
}
