import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNavbar />
      <main id="konten-utama" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
