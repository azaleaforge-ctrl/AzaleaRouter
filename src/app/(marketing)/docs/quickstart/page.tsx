import type { Metadata } from "next";
import { DocArticleClient } from "@/components/marketing/doc-article";

export const metadata: Metadata = {
  title: "Quickstart API",
  description:
    "Kirim request pertama ke API AzaleaRouter: Base URL, API key demo, dan contoh request. Konten demo.",
};

export default function QuickstartPage() {
  return <DocArticleClient slug="quickstart" breadcrumb="Quickstart" />;
}
