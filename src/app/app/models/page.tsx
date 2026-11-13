import type { Metadata } from "next";
import { AccountModelsClient } from "@/components/user/account-models";

export const metadata: Metadata = {
  title: "Models",
  description: "Katalog model dalam konteks akun demo.",
};

export default function AccountModelsPage() {
  return <AccountModelsClient />;
}
