import type { Metadata } from "next";
import { AdminUpstreamClient } from "@/components/admin/upstream";

export const metadata: Metadata = {
  title: "Upstream — Admin",
  description: "Kesehatan upstream demo dan catatan arsitektur adapter.",
};

export default function AdminUpstreamPage() {
  return <AdminUpstreamClient />;
}
