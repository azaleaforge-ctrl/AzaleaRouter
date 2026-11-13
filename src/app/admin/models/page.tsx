import type { Metadata } from "next";
import { AdminModelsClient } from "@/components/admin/models";

export const metadata: Metadata = {
  title: "Models — Admin",
  description: "Kelola status model katalog demo (simulasi).",
};

export default function AdminModelsPage() {
  return <AdminModelsClient />;
}
