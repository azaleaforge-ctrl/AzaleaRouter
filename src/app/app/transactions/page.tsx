import type { Metadata } from "next";
import { TransactionsClient } from "@/components/user/transactions";

export const metadata: Metadata = {
  title: "Transactions",
  description: "Riwayat transaksi wallet dengan filter tipe, status, dan tanggal. Data demo.",
};

export default function TransactionsPage() {
  return <TransactionsClient />;
}
