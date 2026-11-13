import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const PANEL_POINTS = [
  "Satu API key untuk banyak model AI dari berbagai pengembang.",
  "Saldo prepaid Rupiah dengan rincian biaya per token yang transparan.",
  "Dashboard usage, wallet, dan API key dalam satu tempat.",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — desktop only, restrained gradient per PRD §4.2 */}
      <aside className="relative hidden overflow-hidden border-r border-line lg:block">
        <div className="brand-glow absolute inset-0" aria-hidden="true" />
        <div className="bg-grid-faint absolute inset-0" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" aria-label="AzaleaRouter — beranda" className="w-fit rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo size={30} />
          </Link>
          <div className="max-w-md space-y-6">
            <h2 className="text-2xl font-semibold leading-snug tracking-tight text-ink">
              Akses berbagai model AI melalui satu API.
            </h2>
            <ul className="space-y-3.5">
              {PANEL_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm leading-6 text-muted">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-bright" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="rounded-control border border-line bg-surface/70 px-3 py-2 text-xs leading-5 text-muted backdrop-blur">
              Halaman autentikasi demo — login, registrasi, dan reset password hanya
              disimulasikan di browser tanpa server autentikasi nyata.
            </p>
          </div>
          <p className="text-xs text-muted">© 2026 AzaleaRouter — demo frontend Phase 1.</p>
        </div>
      </aside>

      {/* Form side */}
      <div className="relative flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <Link href="/" aria-label="AzaleaRouter — beranda" className="rounded-control lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo size={26} />
          </Link>
          <span className="hidden lg:block" aria-hidden="true" />
          <ThemeToggle />
        </div>
        <main id="konten-utama" className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
