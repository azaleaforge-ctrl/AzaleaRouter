import type { Metadata } from "next";
import { AdminProvidersClient } from "@/components/admin/providers";

export const metadata: Metadata = {
  title: "Providers — Admin",
  description: "Status endpoint provider demo dan refresh (simulasi).",
};

export default function AdminProvidersPage() {
  return <AdminProvidersClient />;
}
