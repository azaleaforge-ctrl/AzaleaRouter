import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/admin-shell";

export const metadata: Metadata = {
  title: { default: "Admin (demo)", template: "%s · AzaleaRouter Admin" },
  robots: { index: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
