"use client";

import Link from "next/link";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { DemoBadge, DemoNote, ErrorState, Skeleton, SkeletonText } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/formatters";
import type { ContentArticle } from "@/lib/api-client";

/** Shared renderer for docs pages (quickstart / IDE / CLI). */
export function DocArticleClient({
  slug,
  breadcrumb,
}: {
  slug: string;
  breadcrumb: string;
}) {
  const state = useApiData(() => api.content.getDoc(slug), [slug]);

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-muted">
        <Link href="/docs" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Docs
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{breadcrumb}</span>
      </nav>

      {state.loading && state.data === null ? (
        <div aria-busy="true" aria-label="Memuat artikel" className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <SkeletonText lines={8} />
        </div>
      ) : state.error ? (
        state.errorCode === "NOT_FOUND" ? (
          <ErrorState
            title="Artikel tidak ditemukan"
            description="Artikel demo ini tidak tersedia. Coba buka indeks dokumentasi."
          />
        ) : (
          <ErrorState description={state.error} onRetry={state.reload} />
        )
      ) : state.data ? (
        <ArticleBody article={state.data} />
      ) : (
        <ErrorState
          title="Artikel tidak ditemukan"
          description="Artikel demo ini tidak tersedia. Coba buka indeks dokumentasi."
        />
      )}
    </div>
  );
}

export function ArticleBody({ article }: { article: ContentArticle }) {
  return (
    <article>
      <header className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <DemoBadge label="Konten demo" />
          <span className="text-xs text-muted">{article.readingMinutes} menit baca</span>
          <span className="text-xs text-muted">Diperbarui {formatDateTime(article.updatedAt)}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{article.title}</h1>
        <p className="text-[15px] leading-7 text-muted">{article.excerpt}</p>
      </header>

      <div className="prose-demo">
        {article.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {article.relatedSlugs.length > 0 ? (
        <Card className="mt-10 p-5">
          <h2 className="text-sm font-semibold text-ink">Artikel terkait</h2>
          <ul className="mt-3 space-y-2">
            {article.relatedSlugs.map((rel) => (
              <li key={rel}>
                <Link
                  href={`/docs/quickstart`}
                  className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {prettifySlug(rel)}
                </Link>
              </li>
            ))}
          </ul>
          <DemoNote className="mt-4">Tautan terkait mengarah ke indeks dokumentasi demo.</DemoNote>
        </Card>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/docs" className={buttonClasses("secondary", "sm")}>
          ← Semua dokumentasi
        </Link>
        <Link href="/help" className={buttonClasses("ghost", "sm")}>
          Butuh bantuan? Help Center
        </Link>
      </div>
    </article>
  );
}

function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
