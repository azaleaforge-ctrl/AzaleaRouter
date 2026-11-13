import type { Metadata } from "next";
import { BlogArticleClient } from "@/components/marketing/blog-article";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Blog — ${slug}`, description: "Artikel blog AzaleaRouter (konten demo)." };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  return <BlogArticleClient slug={slug} />;
}
