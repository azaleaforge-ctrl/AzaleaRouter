import type { Metadata } from "next";
import { PricingClient } from "@/components/marketing/pricing-calculator";

export const metadata: Metadata = {
  title: "Harga & Kalkulator",
  description:
    "Cara membaca harga per 1M token dan hitung estimasi biaya pemakaian. Estimasi demo — debit final dihitung backend.",
};

export default function PricingPage() {
  return <PricingClient />;
}
