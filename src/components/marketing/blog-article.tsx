"use client";

import Link from "next/link";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { Badge } from "@/components/ui/badge";
import { DemoBadge, ErrorState, Skeleton, SkeletonText } from "@/components/ui/feedback";
import { formatDate } from "@/lib/formatters";

export function BlogArticleClient({ slug }: { slug: string }) {
  const state = useApiData(() => api.content.getBlogPost(slug), [slug]);

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-muted">
        <Link href="/blog" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Blog
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{slug}</span>
      </nav>

      {state.loading && state.data === null ? (
        <div aria-busy="true" aria-label="Memuat artikel" className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <SkeletonText lines={8} />
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
              <Badge tone="primary">{state.data.category}</Badge>
              <DemoBadge label="Konten demo" />
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink">{state.data.title}</h1>
            <p className="flex flex-wrap gap-x-3 text-xs text-muted">
              <span>{formatDate(state.data.updatedAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{state.data.readingMinutes} menit baca</span>
            </p>
            <p className="text-[15px] leading-7 text-muted">{state.data.excerpt}</p>
          </header>

          <div className="prose-demo">
            {state.data.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {state.data.relatedSlugs.length > 0 ? (
            <div className="mt-10 rounded-card border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink">Artikel terkait</h2>
              <ul className="mt-3 space-y-2">
                {state.data.relatedSlugs.map((rel) => (
                  <li key={rel}>
                    <Link href="/blog" className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {rel}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-10">
            <Link href="/blog" className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              ← Semua artikel
            </Link>
          </div>
        </article>
      ) : (
        <ErrorState title="Artikel tidak ditemukan" description="Artikel demo ini tidak tersedia." />
      )}
    </div>
  );
}
