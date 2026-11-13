import type { Metadata } from "next";
import { BlogIndexClient } from "@/components/marketing/blog-index";

export const metadata: Metadata = {
  title: "Blog",
  description: "Update produk, model, tutorial, dan berita AI AzaleaRouter. Konten demo.",
};

export default function BlogPage() {
  return <BlogIndexClient />;
}
