"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Drawer } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { useApiData, useClickOutside } from "@/components/shared/hooks";
import { api } from "@/components/shared/api";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Umum",
    items: [
      { href: "/app/overview", label: "Overview", icon: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-4v-5h-4v5H4a1 1 0 0 1-1-1v-6.5Z" },
      { href: "/app/chat", label: "AI Chat", icon: "M4 5h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9l-3.5 3V13H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" },
      { href: "/app/models", label: "Models", icon: "M4 5.5h5v5H4v-5Zm7 0h5v5h-5v-5Zm-7 7h5v5H4v-5Zm7 0h5v5h-5v-5Z" },
      { href: "/app/usage", label: "Usage Analytics", icon: "M4 16V9m4 7V4m4 12v-5m4 5V7" },
    ],
  },
  {
    title: "Wallet",
    items: [
      { href: "/app/wallet", label: "Wallet & Top-up", icon: "M3 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 2.5h14M13.5 12h.01" },
      { href: "/app/transactions", label: "Transactions", icon: "M4 7h12m0 0-3-3m3 3-3 3M16 13H4m0 0 3 3m-3-3 3-3" },
    ],
  },
  {
    title: "Developer",
    items: [
      { href: "/app/api-keys", label: "API Keys", icon: "M14.5 4.5a3 3 0 1 1-2.6 4.5L4 16.9V19h2.1l.9-.9v-1.6h1.6l1-1v-1.6h1.6l1.3-1.3a3 3 0 0 1 2-5.9Z" },
      { href: "/app/playground", label: "API Playground", icon: "M6 5l-3 5 3 5M14 5l3 5-3 5M11 4l-2 12" },
    ],
  },
  {
    title: "Akun",
    items: [
      { href: "/app/notifications", label: "Notifikasi", icon: "M10 3a5 5 0 0 1 5 5v3l1.5 2.5H3.5L5 11V8a5 5 0 0 1 5-5Zm-1.5 13a1.5 1.5 0 0 0 3 0" },
      { href: "/app/settings/profile", label: "Profil", icon: "M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 7a6 6 0 0 1 12 0" },
      { href: "/app/settings/security", label: "Keamanan", icon: "M10 2.5 16 5v4.5c0 4-2.6 6.9-6 8-3.4-1.1-6-4-6-8V5l6-2.5Z" },
      { href: "/app/settings/preferences", label: "Preferensi", icon: "M4 6h12M4 10h12M4 14h12M8 6v0m4 4v0m-4 4v0" },
    ],
  },
];

const RESOURCES: NavItem[] = [
  { href: "/docs", label: "Dokumentasi", icon: "M5 3.5h8.5L17 7v9.5H5v-13Zm8.5 0V7H17" },
  { href: "/help", label: "Help Center", icon: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm-2-8.2A2.2 2.2 0 1 1 10.8 11c-.6.3-.8.7-.8 1.4m0 2h.01" },
];

function NavLinks({ onNavigate, pathname }: { onNavigate?: () => void; pathname: string }) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav aria-label="Navigasi aplikasi" className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-control px-3 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive(item.href)
                      ? "bg-primary-soft text-primary"
                      : "text-muted hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
          Sumber Daya
        </p>
        <ul className="space-y-0.5">
          {RESOURCES.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-control px-3 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function AvatarMenu({ profile }: { profile: { name: string; email: string; avatarInitials: string } | null }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const { toast } = useToast();
  const router = useRouter();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu akun"
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary transition-shadow hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {profile?.avatarInitials ?? "…"}
      </button>
      {open ? (
        <div role="menu" aria-label="Menu akun" className="absolute right-0 top-11 z-50 w-56 rounded-card border border-line bg-surface p-1.5 shadow-float animate-fade-in">
          <div className="border-b border-line px-3 py-2">
            <p className="text-[13px] font-semibold text-ink">{profile?.name ?? "Pengguna demo"}</p>
            <p className="truncate text-xs text-muted">{profile?.email ?? "memuat profil demo…"}</p>
          </div>
          <Link role="menuitem" href="/app/settings/profile" onClick={() => setOpen(false)} className="block rounded-control px-3 py-2 text-[13px] text-ink hover:bg-surface-2">
            Profil
          </Link>
          <Link role="menuitem" href="/app/settings/preferences" onClick={() => setOpen(false)} className="block rounded-control px-3 py-2 text-[13px] text-ink hover:bg-surface-2">
            Preferensi
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              void api.auth.logout();
              toast({ title: "Logout disimulasikan", description: "Tidak ada sesi nyata yang diakhiri di demo ini.", tone: "primary" });
              router.push("/");
            }}
            className="block w-full rounded-control px-3 py-2 text-left text-[13px] text-danger hover:bg-danger-soft"
          >
            Keluar (simulasi)
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function UserShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profile = useApiData(() => api.settings.getProfile(), []);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line px-5 py-4">
          <Link href="/app/overview" aria-label="AzaleaRouter — dashboard" className="rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo size={26} />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks pathname={pathname} />
        </div>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] leading-4 text-muted">
            Mode demo — data dan aksi bersifat ilustratif.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Buka menu navigasi"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
                className="inline-flex size-9 items-center justify-center rounded-control border border-line bg-surface text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round" />
                </svg>
              </button>
              <span className="text-[13px] font-medium text-muted lg:hidden">
                <Logo size={24} withWord={false} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/app/notifications"
                aria-label="Notifikasi"
                className="inline-flex size-9 items-center justify-center rounded-control border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3a5 5 0 0 1 5 5v3l1.5 2.5h-13L5 8a5 5 0 0 1 5-5Zm-1.5 12a1.5 1.5 0 0 0 3 0" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <ThemeToggle />
              <AvatarMenu profile={profile.data} />
            </div>
          </div>
        </header>

        <main id="konten-utama" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Menu">
        <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
      </Drawer>
    </div>
  );
}
