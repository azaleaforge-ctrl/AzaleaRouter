"use client";

import Link from "next/link";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { DataState } from "@/components/shared/states";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoBadge, DemoNote, Skeleton } from "@/components/ui/feedback";
import { CodeBlock } from "@/components/ui/code";
import { DeveloperLogo } from "@/components/ui/developer-logo";
import { modelStatusPill } from "@/components/ui/badge";
import { formatUsdPerMillion, formatCompactNumber } from "@/lib/formatters";
import type { ModelSummary } from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

/**
 * Documentation sample only. `.example` is reserved and never resolves to a
 * live service. Replace with the confirmed production base URL (or
 * NEXT_PUBLIC_AZALEA_API_BASE_URL) before use.
 */
const SAMPLE_API_BASE_URL = "https://api.azalearouter.example/v1";

const HERO_SNIPPET = `curl ${SAMPLE_API_BASE_URL}/chat/completions \\
  -H "Authorization: Bearer $AZALEA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "nama-model/pilihanmu",
    "messages": [
      { "role": "user", "content": "Halo, perkenalkan dirimu!" }
    ]
  }'`;

function Hero({ featured }: { featured: ModelSummary[] }) {
  const cheapest = featured.reduce<number | null>(
    (min, m) => (m.pricing.inputPerMillion !== null && (min === null || m.pricing.inputPerMillion < min) ? m.pricing.inputPerMillion : min),
    null,
  );
  return (
    <section className="relative overflow-hidden">
      <div className="brand-glow absolute inset-0" aria-hidden="true" />
      <div className="bg-grid-faint absolute inset-0" aria-hidden="true" />
      <div className="container-page relative pb-16 pt-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="stagger space-y-7">
            <div>
              <Badge tone="primary" className="mb-5">
                Demo interaktif · data ilustratif
              </Badge>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
                Satu API untuk semua{" "}
                <span className="bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent">
                  model AI
                </span>{" "}
                favoritmu.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              AzaleaRouter menghubungkan aplikasimu ke banyak model AI lewat satu API key —
              dengan saldo Rupiah, harga per 1M token yang transparan, dan dashboard pemakaian
              yang rinci.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/register" className={buttonClasses("primary", "lg")}>
                Mulai Sekarang
              </Link>
              <Link href="/models" className={buttonClasses("secondary", "lg")}>
                Jelajahi Models
              </Link>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2 text-sm">
              {[
                ["50+", "model direncanakan untuk katalog launch"],
                ["1", "API key untuk semua model"],
                ["Rp", "saldo prepaid, harga per 1M token"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-xl font-semibold tracking-tight text-ink">{value}</dd>
                  <dd className="text-xs text-muted">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative animate-fade-up [animation-delay:0.25s]">
            <CodeBlock code={HERO_SNIPPET} filename="request uji — OpenAI-compatible" className="shadow-float" />
            <Card className="absolute -bottom-8 -left-4 hidden w-56 p-4 shadow-float sm:block lg:-left-10">
              <p className="text-xs font-medium text-muted">Harga mulai dari (demo)</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                {cheapest !== null ? `$${cheapest.toFixed(2)}` : "—"}
                <span className="ml-1 text-xs font-normal text-muted">/ 1M token</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-teal-bright" />
              </div>
              <p className="mt-2 text-[11px] text-muted">Termurah di katalog demo saat ini.</p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Value props                                                         */
/* ------------------------------------------------------------------ */

const VALUE_PROPS = [
  {
    title: "Satu API key",
    body: "Satu kredensial AzaleaRouter untuk aplikasi, IDE, dan CLI yang kompatibel — tanpa mengelola kunci per provider.",
    icon: "M14.5 4.5a3 3 0 1 1-2.6 4.5L4 16.9V19h2.1l.9-.9v-1.6h1.6l1-1v-1.6h1.6l1.3-1.3a3 3 0 0 1 2-5.9Z",
  },
  {
    title: "Pilihan model",
    body: "Bandingkan model coding, chat umum, reasoning, dan vision dari berbagai pengembang dalam satu katalog.",
    icon: "M4 5.5h5v5H4v-5Zm7 0h5v5h-5v-5Zm-7 7h5v5H4v-5Zm7 0h5v5h-5v-5Z",
  },
  {
    title: "Saldo Rupiah",
    body: "Sistem prepaid pay-as-you-go: isi saldo lebih dulu, biaya dipotong dari pemakaian aktual.",
    icon: "M3 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 2.5h14M13.5 12h.01",
  },
  {
    title: "Transparansi biaya",
    body: "Harga input dan output ditampilkan terpisah per 1M token, lengkap dengan riwayat transaksi.",
    icon: "M4 16V9m4 7V4m4 12v-5m4 5V7",
  },
];

function ValueProps() {
  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="value-title">
      <h2 id="value-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Dirancang untuk pengguna Indonesia
      </h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted">
        Dari developer individu hingga pengguna AI umum — semua kebutuhan akses model dalam
        satu platform dengan biaya yang mudah dipahami.
      </p>
      <div className="stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map((prop) => (
          <Card key={prop.title} className="p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
            <span aria-hidden="true" className="mb-4 inline-flex size-10 items-center justify-center rounded-control bg-primary-soft text-primary">
              <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={prop.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="text-[15px] font-semibold text-ink">{prop.title}</h3>
            <p className="mt-1.5 text-[13px] leading-6 text-muted">{prop.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Featured models (adapter-fed, never hard-coded)                     */
/* ------------------------------------------------------------------ */

function ModelCard({ model }: { model: ModelSummary }) {
  return (
    <Card className="flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <DeveloperLogo initials={model.developer.logoInitials} name={model.developer.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{model.name}</p>
            <p className="truncate text-xs text-muted">{model.developer.name}</p>
          </div>
        </div>
        {modelStatusPill(model.status)}
      </div>
      <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-muted">{model.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-control bg-surface-2/70 p-3 text-xs">
        <div>
          <dt className="text-muted">Input</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-ink">
            {formatUsdPerMillion(model.pricing.inputPerMillion)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Output</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-ink">
            {formatUsdPerMillion(model.pricing.outputPerMillion)}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {model.contextWindow ? (
          <Badge tone="outline">{formatCompactNumber(model.contextWindow)} konteks</Badge>
        ) : null}
        {model.capabilities.slice(0, 2).map((cap) => (
          <Badge key={cap} tone="outline">
            {cap}
          </Badge>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
        <DemoBadge />
        <Link
          href={`/models/${model.slug.split("/")[0]}/${model.slug.split("/")[1] ?? model.id}`}
          className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Lihat detail →
        </Link>
      </div>
    </Card>
  );
}

function FeaturedModels({ state }: { state: ReturnType<typeof useApiData<ModelSummary[]>> }) {
  return (
    <section className="border-y border-line bg-surface py-16 sm:py-20" aria-labelledby="featured-title">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="featured-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Model pilihan
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted">
              Contoh model dari katalog demo beserta harga dan kemampuannya. Katalog lengkap
              dapat difilter berdasarkan kategori, pengembang, dan harga.
            </p>
          </div>
          <Link href="/models" className={buttonClasses("secondary", "sm")}>
            Lihat semua models
          </Link>
        </div>
        <div className="mt-10">
          <DataState
            loading={state.loading}
            error={state.error}
            data={state.data}
            isEmpty={(items) => items.length === 0}
            emptyTitle="Katalog demo belum menampilkan model"
            skeleton={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <Card key={i} className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-16 w-full" />
                  </Card>
                ))}
              </div>
            }
          >
            {(models) => (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {models.slice(0, 6).map((model) => (
                  <li key={model.id}>
                    <ModelCard model={model} />
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </div>
        <DemoNote className="mt-6">
          Kartu model diambil dari katalog demo (mock adapter). Harga, status, dan kemampuan
          bersifat ilustratif — bukan klaim ketersediaan atau harga nyata.
        </DemoNote>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Use cases / How it works / Pricing preview / Integrations / FAQ     */
/* ------------------------------------------------------------------ */

const USE_CASES = [
  { title: "Coding", body: "Assistant coding di IDE atau CLI dengan model yang dioptimalkan untuk kode.", icon: "M6 5l-3 5 3 5M14 5l3 5-3 5" },
  { title: "Chat umum", body: "Menulis, merangkum, menganalisis, dan bertanya lewat AI Chat.", icon: "M4 5h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9l-3.5 3V13H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" },
  { title: "Reasoning", body: "Model dengan kemampuan reasoning untuk analisis yang lebih dalam.", icon: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm-3-7.5 2 2 4-4.5" },
  { title: "Vision", body: "Model dengan input gambar untuk kebutuhan multimodal.", icon: "M3.5 5.5h13v10h-13v-10ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
  { title: "Integrasi API", body: "Endpoint OpenAI-compatible untuk aplikasi yang sudah ada.", icon: "M4 10h12m0 0-3-3m3 3-3 3" },
];

function UseCases() {
  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="usecase-title">
      <h2 id="usecase-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Untuk berbagai kebutuhan
      </h2>
      <div className="stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {USE_CASES.map((uc) => (
          <Card key={uc.title} className="p-5">
            <span aria-hidden="true" className="mb-3 inline-flex size-9 items-center justify-center rounded-control bg-teal-soft text-teal">
              <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={uc.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="text-sm font-semibold text-ink">{uc.title}</h3>
            <p className="mt-1.5 text-[13px] leading-6 text-muted">{uc.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { title: "Daftar", body: "Buat akun dan verifikasi email." },
  { title: "Top-up saldo", body: "Isi saldo Rupiah mulai Rp50.000 (disimulasikan di demo)." },
  { title: "Buat API key", body: "Terbitkan key berawalan AZL- dari dashboard." },
  { title: "Pilih model", body: "Bandingkan harga dan kemampuan di marketplace." },
  { title: "Gunakan", body: "Panggil endpoint OpenAI-compatible dari aplikasimu." },
];

function HowItWorks() {
  return (
    <section className="border-y border-line bg-surface py-16 sm:py-20" aria-labelledby="how-title">
      <div className="container-page">
        <h2 id="how-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Cara kerjanya
        </h2>
        <ol className="stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Card className="h-full p-5">
                <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-muted">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PricingPreview() {
  const state = useApiData(() => api.catalog.featured(), []);
  const examples = (state.data ?? []).slice(0, 3);
  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="pricing-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="pricing-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Harga yang mudah dibandingkan
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted">
            Harga input dan output ditampilkan terpisah per 1 juta token. Hitung estimasi biaya
            untuk skenario pemakaianmu di kalkulator.
          </p>
        </div>
        <Link href="/pricing" className={buttonClasses("secondary", "sm")}>
          Buka kalkulator harga
        </Link>
      </div>
      <div className="mt-10 overflow-hidden rounded-card border border-line bg-surface shadow-soft">
        <table className="w-full text-sm">
          <caption className="sr-only">Contoh tarif demo per 1 juta token</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2/60 text-left">
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Model</th>
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Input / 1M</th>
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Output / 1M</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {examples.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-muted">
                  Memuat contoh tarif demo…
                </td>
              </tr>
            ) : (
              examples.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3.5 font-medium text-ink">{m.name}</td>
                  <td className="px-5 py-3.5 tabular-nums text-ink">{formatUsdPerMillion(m.pricing.inputPerMillion)}</td>
                  <td className="px-5 py-3.5 tabular-nums text-ink">{formatUsdPerMillion(m.pricing.outputPerMillion)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <DemoNote className="mt-4">
        Contoh tarif berasal dari snapshot demo dan dapat berubah — bukan harga jual nyata.
      </DemoNote>
    </section>
  );
}

const INTEGRATIONS = [
  {
    title: "Aplikasi OpenAI-compatible",
    body: "Cukup ganti Base URL dan gunakan API key AzaleaRouter.",
    code: `base_url = "${SAMPLE_API_BASE_URL}"\napi_key  = $AZALEA_API_KEY  # key demo, awalan AZL-`,
  },
  {
    title: "IDE",
    body: "Panduan konfigurasi untuk assistant coding di editormu.",
    code: `// settings.json (contoh)\n{ "apiBase": "${SAMPLE_API_BASE_URL}",\n  "apiKey": "<AZALEA_API_KEY>" }`,
  },
  {
    title: "CLI",
    body: "Gunakan model lewat command line dengan profil terpisah.",
    code: "$ export AZALEA_API_KEY=azl-...\n$ azr chat --model nama-model/pilihanmu",
  },
];

function Integrations() {
  return (
    <section className="border-y border-line bg-surface py-16 sm:py-20" aria-labelledby="integrations-title">
      <div className="container-page">
        <h2 id="integrations-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Integrasikan dengan alur kerjamu
        </h2>
        <div className="stagger mt-10 grid gap-4 lg:grid-cols-3">
          {INTEGRATIONS.map((integ) => (
            <div key={integ.title} className="space-y-4">
              <div>
                <h3 className="text-[15px] font-semibold text-ink">{integ.title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-muted">{integ.body}</p>
              </div>
              <CodeBlock code={integ.code} filename="contoh konfigurasi" />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/docs/quickstart" className={buttonClasses("secondary", "sm")}>
            Quickstart API
          </Link>
          <Link href="/docs" className={buttonClasses("ghost", "sm")}>
            Semua panduan →
          </Link>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Apakah data di situs ini nyata?",
    a: "Tidak. Seluruh katalog, harga, saldo, transaksi, dan status adalah data demo ilustratif yang dijalankan oleh mock adapter di browser. Tidak ada request ke layanan upstream.",
  },
  {
    q: "Bagaimana skema pembayarannya?",
    a: "Rencana produknya adalah prepaid pay-as-you-go dalam Rupiah dengan minimum top-up Rp50.000. Pada demo ini, alur top-up hanya disimulasikan dan tidak ada pembayaran nyata yang diproses.",
  },
  {
    q: "API key seperti apa yang akan saya dapatkan?",
    a: "API key AzaleaRouter direncanakan berawalan AZL-. Di demo, key yang ditampilkan adalah token demo yang jelas tidak dapat dipakai untuk request nyata.",
  },
  {
    q: "Model apa saja yang tersedia?",
    a: "Katalog demo memuat contoh model dari beberapa pengembang. Katalog launch ditargetkan berisi minimal 50 model tervalidasi — target tersebut belum terpenuhi oleh data demo.",
  },
  {
    q: "Apakah kompatibel dengan library OpenAI?",
    a: "Rencana desainnya adalah endpoint OpenAI-compatible sehingga cukup mengganti Base URL. Lihat halaman Docs untuk panduan integrasi yang direncanakan.",
  },
];

function Faq() {
  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Pertanyaan umum
      </h2>
      <div className="mt-8 max-w-3xl space-y-3">
        {FAQS.map((faq) => (
          <details key={faq.q} className="group rounded-card border border-line bg-surface shadow-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-ink transition-colors hover:bg-surface-2/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              {faq.q}
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
            </summary>
            <p className="border-t border-line px-5 py-4 text-sm leading-7 text-muted">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="container-page pb-20" aria-labelledby="cta-title">
      <div className="brand-glow relative overflow-hidden rounded-card border border-line px-6 py-14 text-center sm:px-12">
        <div className="bg-grid-faint absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-2xl space-y-5">
          <h2 id="cta-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Siap mencoba AzaleaRouter?
          </h2>
          <p className="text-[15px] leading-7 text-muted">
            Buat akun demo, jelajahi katalog, dan rasakan alurnya — dari top-up hingga request
            pertama, semuanya dalam mode simulasi yang aman.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/register" className={buttonClasses("primary", "lg")}>
              Buat akun demo
            </Link>
            <Link href="/docs/quickstart" className={buttonClasses("secondary", "lg")}>
              Baca quickstart
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const featured = useApiData(() => api.catalog.featured(), []);
  return (
    <>
      <Hero featured={featured.data ?? []} />
      <ValueProps />
      <FeaturedModels state={featured} />
      <UseCases />
      <HowItWorks />
      <PricingPreview />
      <Integrations />
      <Faq />
      <FinalCta />
    </>
  );
}
