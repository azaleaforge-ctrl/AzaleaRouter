import type { Metadata } from "next";
import { AdminSettingsClient } from "@/components/admin/settings";

export const metadata: Metadata = {
  title: "Settings — Admin",
  description: "Pengaturan platform demo (simulasi lokal — kontrak backend belum tersedia).",
};

export default function AdminSettingsPage() {
  return <AdminSettingsClient />;
}
