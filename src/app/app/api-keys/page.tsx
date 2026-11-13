import type { Metadata } from "next";
import { ApiKeysClient } from "@/components/user/api-keys";

export const metadata: Metadata = {
  title: "API Keys",
  description: "Kelola API key demo berawalan AZL-. Secret hanya ditampilkan sekali saat dibuat.",
};

export default function ApiKeysPage() {
  return <ApiKeysClient />;
}
