import type { Metadata } from "next";
import { AdminPaymentsClient } from "@/components/admin/payments";

export const metadata: Metadata = {
  title: "Payments — Admin",
  description: "Transaksi pembayaran demo dan statusnya. Webhook tidak disimulasikan mengubah saldo nyata.",
};

export default function AdminPaymentsPage() {
  return <AdminPaymentsClient />;
}
