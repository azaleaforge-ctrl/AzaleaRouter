import type { Metadata } from "next";
import { AdminSupportClient } from "@/components/admin/support";

export const metadata: Metadata = {
  title: "Support — Admin",
  description: "Modul tiket dukungan demo (kontrak belum tersedia — simulasi lokal).",
};

export default function AdminSupportPage() {
  return <AdminSupportClient />;
}
