import type { Metadata } from "next";
import { UsageClient } from "@/components/user/usage";

export const metadata: Metadata = {
  title: "Usage Analytics",
  description: "Analitik pemakaian demo: biaya, request, token, dan warna model yang konsisten.",
};

export default function UsagePage() {
  return <UsageClient />;
}
