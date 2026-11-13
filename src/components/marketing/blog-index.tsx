"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { formatDate } from "@/lib/formatters";

export function BlogIndexClient() {
  const state = useApiData(() => api.content.listBlog(), []);
  const [category, setCategory] = useState<string>("");

  const categories = useMemo(
    () => Array.from(new Set((state.data ?? []).map((a) => a.category))),
    [state.data],
  );
  const posts = (state.data ?? []).filter((a) => !category || a.category === category);

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        title="Blog"
        description="Update produk, model baru, tutorial, dan perbandingan model."
        actions={<DemoBadge label="Konten demo" />}
      />

      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
        <button
          type="button"
          aria-pressed={category === ""}
          onClick={() => setCategory("")}
          className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            category === "" ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          Semua
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              category === c ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {state.loading && state.data === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted">Belum ada artikel untuk kategori ini.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <Card className="flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
                  <Badge tone="primary" className="w-fit">
                    {post.category}
                  </Badge>
                  <h2 className="mt-3 text-[15px] font-semibold leading-6 text-ink">{post.title}</h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-6 text-muted">{post.excerpt}</p>
                  <p className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
                    <span>{formatDate(post.updatedAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{post.readingMinutes} menit baca</span>
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <DemoNote className="mt-10">
        Artikel blog adalah konten demo — bukan pengumuman produk atau berita nyata.
      </DemoNote>
    </div>
  );
}
