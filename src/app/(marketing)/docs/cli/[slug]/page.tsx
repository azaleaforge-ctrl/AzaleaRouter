import type { Metadata } from "next";
import { DocArticleClient } from "@/components/marketing/doc-article";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Panduan CLI — ${slug}`,
    description: "Panduan integrasi AzaleaRouter untuk CLI. Konten demo — hanya aplikasi teruji yang akan dicantumkan.",
  };
}

export default async function CliDocPage({ params }: Props) {
  const { slug } = await params;
  return <DocArticleClient slug={slug} breadcrumb={`CLI · ${slug}`} />;
}
