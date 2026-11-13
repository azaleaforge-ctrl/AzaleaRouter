import type { Metadata } from "next";
import { HelpArticleClient } from "@/components/marketing/help-article";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Artikel bantuan — ${slug}`, description: "Artikel Help Center AzaleaRouter (konten demo)." };
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params;
  return <HelpArticleClient slug={slug} />;
}
