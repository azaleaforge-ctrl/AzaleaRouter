import type { Metadata } from "next";
import { MarketplaceClient } from "@/components/marketing/catalog";

export const metadata: Metadata = {
  title: "Model Marketplace",
  description:
    "Jelajahi dan bandingkan model AI berdasarkan kategori, pengembang, kemampuan, dan harga per 1M token. Katalog demo — data ilustratif.",
};

export default function ModelsPage() {
  return <MarketplaceClient />;
}
