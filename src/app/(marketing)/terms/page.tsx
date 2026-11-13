import type { Metadata } from "next";
import Link from "next/link";
import { DemoNote } from "@/components/ui/feedback";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Placeholder Terms of Service AzaleaRouter — menunggu review legal, bukan dokumen yang berlaku.",
};

const SECTIONS: Array<{ title: string; points: string[] }> = [
  {
    title: "1. Tentang dokumen ini",
    points: [
      "Dokumen ini adalah placeholder struktur Terms of Service untuk kebutuhan demo frontend.",
      "Ketentuan yang berlaku akan diterbitkan setelah review legal selesai dan tidak boleh dianggap sudah final.",
    ],
  },
  {
    title: "2. Akun dan keamanan",
    points: [
      "Placeholder: ketentuan pendaftaran akun, verifikasi email, dan tanggung jawab menjaga kredensial.",
      "Placeholder: kebijakan penonaktifan akun dan pelanggaran penggunaan.",
    ],
  },
  {
    title: "3. Saldo, pembayaran, dan pemakaian",
    points: [
      "Placeholder: skema prepaid pay-as-you-go, minimum top-up, dan kapan saldo dipotong.",
      "Placeholder: penanganan refund, reversal, dan transaksi pending reconciliation.",
    ],
  },
  {
    title: "4. Penggunaan API",
    points: [
      "Placeholder: aturan penggunaan API key berawalan AZL-, batas rate limit, dan larangan penyalahgunaan.",
      "Placeholder: ketersediaan model dan endpoint tidak dijamin tanpa validasi upstream.",
    ],
  },
  {
    title: "5. Batasan tanggung jawab",
    points: [
      "Placeholder: batasan jaminan layanan dan ketersediaan model pihak ketiga.",
      "Placeholder: hubungan dengan penyedia upstream dan perubahan katalog.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Terms of Service</h1>
        <p className="text-sm leading-6 text-muted">
          Versi placeholder untuk demo frontend — <strong className="text-ink">bukan ketentuan hukum yang berlaku</strong>.
        </p>
      </header>

      <DemoNote className="mb-8">
        Dokumen ini menunggu review legal. Jangan menyebarkan atau mengutipnya sebagai ketentuan
        resmi AzaleaRouter.
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
        Lihat juga <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link> (juga
        placeholder).
      </p>
    </div>
  );
}
