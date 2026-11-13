import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main id="konten-utama" className="flex min-h-dvh flex-col items-center justify-center px-4">
      <Logo size={32} />
      <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-primary">Error 404</p>
      <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight text-ink">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-3 max-w-md text-center text-sm leading-6 text-muted">
        Tautan yang kamu buka tidak tersedia di demo ini. Coba jelajahi katalog model atau
        kembali ke beranda.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses("primary", "md")}>
          Ke beranda
        </Link>
        <Link href="/models" className={buttonClasses("secondary", "md")}>
          Jelajahi Models
        </Link>
        <Link href="/help" className={buttonClasses("ghost", "md")}>
          Help Center
        </Link>
      </div>
    </main>
  );
}
