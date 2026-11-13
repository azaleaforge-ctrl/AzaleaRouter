import type { Metadata } from "next";
import { AdminUsersClient } from "@/components/admin/users";

export const metadata: Metadata = {
  title: "Users — Admin",
  description: "Kelola pengguna demo: cari, filter status, suspend/aktivasi (simulasi).",
};

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
