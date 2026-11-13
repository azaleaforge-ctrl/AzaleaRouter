import type { Metadata } from "next";
import { WalletClient } from "@/components/user/wallet";

export const metadata: Metadata = {
  title: "Wallet & Top-up",
  description: "Saldo, riwayat, dan alur top-up tersimulasi. Tidak ada pembayaran nyata di demo.",
};

export default function WalletPage() {
  return <WalletClient />;
}
