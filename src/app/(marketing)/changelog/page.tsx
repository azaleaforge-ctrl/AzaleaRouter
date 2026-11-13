import type { Metadata } from "next";
import { ChangelogClient } from "@/components/marketing/changelog";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Riwayat perubahan produk dan API AzaleaRouter. Konten demo.",
};

export default function ChangelogPage() {
  return <ChangelogClient />;
}
