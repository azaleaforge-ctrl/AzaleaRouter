import type { Metadata } from "next";
import type { ReactNode } from "react";
import { UserShell } from "@/components/layout/user-shell";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · AzaleaRouter" },
  robots: { index: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
