import type { Metadata } from "next";
import { DocArticleClient } from "@/components/marketing/doc-article";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Panduan IDE — ${slug}`,
    description: "Panduan integrasi AzaleaRouter untuk IDE. Konten demo — hanya aplikasi teruji yang akan dicantumkan.",
  };
}

export default async function IdeDocPage({ params }: Props) {
  const { slug } = await params;
  return <DocArticleClient slug={slug} breadcrumb={`IDE · ${slug}`} />;
}
