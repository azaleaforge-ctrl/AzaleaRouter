import type { Metadata } from "next";
import { OverviewClient } from "@/components/user/overview";

export const metadata: Metadata = {
  title: "Overview",
  description: "Ringkasan dashboard demo: saldo, usage, dan aktivitas terbaru.",
};

export default function OverviewPage() {
  return <OverviewClient />;
}
