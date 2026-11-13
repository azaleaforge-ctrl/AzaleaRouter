import type { Metadata } from "next";
import { AdminWalletsClient } from "@/components/admin/wallets";

export const metadata: Metadata = {
  title: "Wallets — Admin",
  description: "Ringkasan saldo per pengguna (demo). Inspeksi ledger memerlukan kontrak khusus.",
};

export default function AdminWalletsPage() {
  return <AdminWalletsClient />;
}
