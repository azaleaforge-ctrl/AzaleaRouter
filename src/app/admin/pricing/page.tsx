import type { Metadata } from "next";
import { AdminPricingClient } from "@/components/admin/pricing";

export const metadata: Metadata = {
  title: "Pricing — Admin",
  description: "Snapshot harga katalog demo dan panel kebijakan harga (simulasi tampilan).",
};

export default function AdminPricingPage() {
  return <AdminPricingClient />;
}
