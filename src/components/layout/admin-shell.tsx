"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Drawer } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { DemoBadge } from "@/components/ui/feedback";

const ADMIN_NAV: Array<{ href: string; label: string }> = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/models", label: "Models" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/wallets", label: "Wallets" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/usage", label: "Usage" },
  { href: "/admin/upstream", label: "Upstream" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings" },
];

/**
 * Demo role switcher: navigation aid only, never a security boundary.
 * Switching merely routes between demo areas.
 */
function RoleSwitcher() {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="hidden sm:inline">Peran demo:</span>
      <Select
        aria-label="Pilih peran demo"
        className="h-8 w-28 py-0 text-xs"
        defaultValue="admin"
        onChange={(e) => {
          if (e.target.value === "admin") router.push("/admin/overview");
          else router.push("/app/overview");
        }}
      >
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </Select>
    </label>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const navList = (onNavigate?: () => void) => (
    <nav aria-label="Navigasi admin" className="space-y-0.5">
      {ADMIN_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={`block rounded-control px-3 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isActive(item.href) ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Demo guard ribbon */}
      <div className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 text-center">
        <Badge tone="warning" dot>
          Panel admin demo
        </Badge>
        <p className="text-xs font-medium text-warning">
          Semua aksi hanya mengubah state lokal — tidak ada perubahan nyata pada ledger, pengguna, atau upstream.
        </p>
      </div>

      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <div className="border-b border-line px-5 py-4">
            <Link href="/admin/overview" aria-label="AzaleaRouter — admin" className="rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Logo size={26} />
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <DemoBadge label="Konsol demo" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">{navList()}</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Buka menu navigasi admin"
                  aria-expanded={drawerOpen}
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex size-9 items-center justify-center rounded-control border border-line bg-surface text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="lg:hidden">
                  <Logo size={24} withWord={false} />
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <RoleSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main id="konten-utama" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Navigasi admin">
        {navList(() => setDrawerOpen(false))}
      </Drawer>
    </div>
  );
}
