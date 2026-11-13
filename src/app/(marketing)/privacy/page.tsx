import type { Metadata } from "next";
import Link from "next/link";
import { DemoNote } from "@/components/ui/feedback";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Placeholder Privacy Policy AzaleaRouter — menunggu review legal, bukan dokumen yang berlaku.",
};

const SECTIONS: Array<{ title: string; points: string[] }> = [
  {
    title: "1. Tentang dokumen ini",
    points: [
      "Dokumen ini adalah placeholder struktur Privacy Policy untuk kebutuhan demo frontend.",
      "Kebijakan yang berlaku akan diterbitkan setelah review legal selesai.",
    ],
  },
  {
    title: "2. Data yang dikumpulkan",
    points: [
      "Placeholder: data akun (nama, email), data pemakaian (token, biaya), dan data pembayaran melalui payment gateway.",
      "Placeholder: prinsip data minimization — konten percakapan tidak disimpan untuk analytics tanpa persetujuan.",
    ],
  },
  {
    title: "3. API key dan keamanan",
    points: [
      "Placeholder: API key disimpan sebagai hash/HMAC, bukan plaintext; secret hanya ditampilkan sekali saat dibuat.",
      "Placeholder: kredensial upstream tidak pernah diberikan kepada pelanggan.",
    ],
  },
  {
    title: "4. Retensi dan penghapusan",
    points: [
      "Placeholder: periode retensi log transaksi dan riwayat usage.",
      "Placeholder: mekanisme penghapusan percakapan dan data akun.",
    ],
  },
  {
    title: "5. Hak pengguna",
    points: [
      "Placeholder: akses, koreksi, dan penghapusan data sesuai regulasi yang berlaku.",
      "Placeholder: cara menghubungi pengendali data.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
        <p className="text-sm leading-6 text-muted">
          Versi placeholder untuk demo frontend — <strong className="text-ink">bukan kebijakan yang berlaku</strong>.
        </p>
      </header>

      <DemoNote className="mb-8">
        Dokumen ini menunggu review legal. Penyimpanan prompt/output dan praktik telemetry akan
        dijelaskan di dokumen final.
      </DemoNote>

      <div className="prose-demo">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-[13px] text-muted">
        Lihat juga <Link href="/terms" className="font-medium text-primary hover:underline">Terms of Service</Link> (juga
        placeholder).
      </p>
    </div>
  );
}
