import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing";

export const metadata: Metadata = {
  title: "AzaleaRouter — Satu API untuk banyak model AI",
  description:
    "Gateway API AI dengan satu akun, satu API key, dan saldo Rupiah. Bandingkan harga per 1M token secara transparan. Situs demo — data bersifat ilustratif.",
};

export default function HomePage() {
  return <LandingPage />;
}
