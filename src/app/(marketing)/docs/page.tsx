import type { Metadata } from "next";
import { DocsIndexClient } from "@/components/marketing/docs-index";

export const metadata: Metadata = {
  title: "Dokumentasi",
  description:
    "Panduan integrasi AzaleaRouter: quickstart API, konfigurasi IDE dan CLI, serta referensi endpoint. Konten demo.",
};

export default function DocsPage() {
  return <DocsIndexClient />;
}
