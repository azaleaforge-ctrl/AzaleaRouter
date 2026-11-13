import type { Metadata } from "next";
import { HelpCenterClient } from "@/components/marketing/help-center";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Pusat bantuan AzaleaRouter: akun, wallet, API key, error, dan troubleshooting. Konten demo.",
};

export default function HelpPage() {
  return <HelpCenterClient />;
}
