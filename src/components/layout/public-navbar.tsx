"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { Drawer } from "@/components/ui/overlay";

const NAV_LINKS = [
  { href: "/models", label: "Models" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
  { href: "/help", label: "Help Center" },
  { href: "/status", label: "Status" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="AzaleaRouter — beranda" className="rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-control px-3 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive(link.href) ? "text-primary" : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/login" className={`${buttonClasses("ghost", "sm")} hidden sm:inline-flex`}>
            Masuk
          </Link>
          <Link href="/register" className={buttonClasses("primary", "sm", "hidden sm:inline-flex")}>
            Mulai
          </Link>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            onClick={() => setMenuOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-control border border-line bg-surface text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Navigasi">
        <nav aria-label="Navigasi seluler" className="space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`block rounded-control px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive(link.href) ? "bg-primary-soft text-primary" : "text-ink hover:bg-surface-2"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="my-3 border-t border-line" />
          <div className="flex flex-col gap-2">
            <Link href="/login" onClick={() => setMenuOpen(false)} className={buttonClasses("secondary", "md")}>
              Masuk
            </Link>
            <Link href="/register" onClick={() => setMenuOpen(false)} className={buttonClasses("primary", "md")}>
              Mulai — buat akun
            </Link>
            <div className="pt-1">
              <ThemeToggle />
            </div>
          </div>
        </nav>
      </Drawer>
    </header>
  );
}
