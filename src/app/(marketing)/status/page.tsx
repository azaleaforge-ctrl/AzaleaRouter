import type { Metadata } from "next";
import { StatusClient } from "@/components/marketing/status-page";

export const metadata: Metadata = {
  title: "Status Layanan",
  description: "Status komponen layanan dan riwayat insiden. Data status demo — bukan klaim uptime nyata.",
};

export default function StatusPage() {
  return <StatusClient />;
}
