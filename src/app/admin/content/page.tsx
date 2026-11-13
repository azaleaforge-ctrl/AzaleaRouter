import type { Metadata } from "next";
import { AdminContentClient } from "@/components/admin/content";

export const metadata: Metadata = {
  title: "Content — Admin",
  description: "Kelola konten publik demo: blog, help center, dan docs (simulasi).",
};

export default function AdminContentPage() {
  return <AdminContentClient />;
}
