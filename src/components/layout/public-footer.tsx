import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { DEMO_DATA_NOTICE } from "@/lib/api-client";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Produk",
    links: [
      { href: "/models", label: "Model Marketplace" },
      { href: "/pricing", label: "Harga & Kalkulator" },
      { href: "/status", label: "Status Layanan" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    title: "Sumber Daya",
    links: [
      { href: "/docs", label: "Dokumentasi" },
      { href: "/docs/quickstart", label: "Quickstart API" },
      { href: "/help", label: "Help Center" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Logo />
          <p className="max-w-xs text-[13px] leading-6 text-muted">
            Gateway API AI dengan satu akun, satu API key, dan saldo Rupiah —
            dirancang untuk developer dan pengguna AI di Indonesia.
          </p>
          <p className="max-w-xs rounded-control bg-surface-2 px-3 py-2 text-xs leading-5 text-muted">
            {DEMO_DATA_NOTICE}
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-[13px] font-semibold text-ink">{col.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-5">
          <p className="text-xs text-muted">© 2026 AzaleaRouter — situs demo, bukan produk komersial.</p>
          <p className="text-xs text-muted">Dibuat sebagai demo frontend Phase 1.</p>
        </div>
      </div>
    </footer>
  );
}
