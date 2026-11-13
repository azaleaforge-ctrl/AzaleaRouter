"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoBadge, DemoNote, ErrorState, Skeleton, SkeletonText } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/formatters";

export function HelpArticleClient({ slug }: { slug: string }) {
  const state = useApiData(() => api.content.getHelpArticle(slug), [slug]);
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null);

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-muted">
        <Link href="/help" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Help Center
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{slug}</span>
      </nav>

      {state.loading && state.data === null ? (
        <div aria-busy="true" aria-label="Memuat artikel" className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <SkeletonText lines={7} />
        </div>
      ) : state.error ? (
        state.errorCode === "NOT_FOUND" ? (
          <ErrorState title="Artikel tidak ditemukan" description="Artikel demo ini tidak tersedia." />
        ) : (
          <ErrorState description={state.error} onRetry={state.reload} />
        )
      ) : state.data ? (
        <article>
          <header className="mb-8 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <DemoBadge label="Konten demo" />
              <span className="text-xs text-muted">{state.data.readingMinutes} menit baca</span>
              <span className="text-xs text-muted">Diperbarui {formatDateTime(state.data.updatedAt)}</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">{state.data.title}</h1>
            <p className="text-[15px] leading-7 text-muted">{state.data.excerpt}</p>
          </header>

          <div className="prose-demo">
            {state.data.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Feedback widget — local simulation */}
          <Card className="mt-10 p-5">
            <h2 className="text-sm font-semibold text-ink">Apakah artikel ini membantu?</h2>
            {feedback === null ? (
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setFeedback("helpful")}>
                  Ya, membantu
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setFeedback("not-helpful")}>
                  Belum membantu
                </Button>
              </div>
            ) : (
              <p role="status" className="mt-3 text-[13px] text-teal">
                {feedback === "helpful"
                  ? "Terima kasih atas masukannya (disimulasikan — tidak ada data yang dikirim)."
                  : "Terima kasih — masukanmu membantu kami memperbaiki artikel (disimulasikan)."}
              </p>
            )}
            <DemoNote className="mt-4">Umpan balik artikel pada demo tidak dikirim ke server.</DemoNote>
          </Card>

          {state.data.relatedSlugs.length > 0 ? (
            <Card className="mt-6 p-5">
              <h2 className="text-sm font-semibold text-ink">Artikel terkait</h2>
              <ul className="mt-3 space-y-2">
                {state.data.relatedSlugs.map((rel) => (
                  <li key={rel}>
                    <Link href="/help" className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {rel}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="mt-10">
            <Link href="/help" className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              ← Kembali ke Help Center
            </Link>
          </div>
        </article>
      ) : (
        <ErrorState title="Artikel tidak ditemukan" description="Artikel demo ini tidak tersedia." />
      )}
    </div>
  );
}
