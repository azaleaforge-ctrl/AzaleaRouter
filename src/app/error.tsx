"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DemoNote } from "@/components/ui/feedback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Demo build: log client-side only, never send telemetry upstream.
    console.error(error);
  }, [error]);

  return (
    <main id="konten-utama" className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-danger">Error</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Terjadi kesalahan pada halaman ini
        </h1>
        <p className="text-sm leading-6 text-muted">
          Kesalahan ditangani di sisi browser demo. Tidak ada data yang dikirim ke layanan lain.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Coba lagi</Button>
          <Button variant="secondary" onClick={() => router.push("/")}>
            Ke beranda
          </Button>
        </div>
        <DemoNote>
          Mode demo — pesan error sengaja dibuat aman dan tidak memuat detail teknis sensitif.
        </DemoNote>
      </div>
    </main>
  );
}
