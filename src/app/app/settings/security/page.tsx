import type { Metadata } from "next";
import { SecurityClient } from "@/components/user/settings-security";

export const metadata: Metadata = {
  title: "Keamanan",
  description: "Pengaturan keamanan akun demo: 2FA, sesi, dan ganti password (simulasi).",
};

export default function SecuritySettingsPage() {
  return <SecurityClient />;
}
