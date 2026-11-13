"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData, useDebounced } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";

export function DocsIndexClient() {
  const state = useApiData(() => api.content.listDocs(), []);
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 250).trim().toLowerCase();

  const sections = (state.data ?? [])
    .map((section) => ({
      ...section,
      articles: q
        ? section.articles.filter(
            (a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q),
          )
        : section.articles,
    }))
    .filter((s) => !q || s.articles.length > 0 || s.title.toLowerCase().includes(q));

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        title="Dokumentasi"
        description="Semua yang dibutuhkan untuk mengintegrasikan AzaleaRouter: dari quickstart hingga panduan IDE dan CLI."
        actions={<DemoBadge label="Konten demo" />}
      />

      <div className="mb-8 max-w-md">
        <Field label="Cari dokumentasi">
          {({ id }) => (
            <Input id={id} type="search" placeholder="mis. base url, api key, streaming…" value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
        </Field>
      </div>

      {/* Quickstart highlight */}
      <Card className="brand-glow mb-10 border-primary/30 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Quickstart</p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
              Request pertama dalam beberapa menit
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-muted">
              Buat API key, atur Base URL, dan kirim request uji ke endpoint OpenAI-compatible.
            </p>
          </div>
          <Link href="/docs/quickstart" className={buttonClasses("primary", "md")}>
            Buka Quickstart
          </Link>
        </div>
      </Card>

      {state.loading && state.data === null ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <Card key={section.slug} className="p-5">
              <h2 className="text-[15px] font-semibold text-ink">{section.title}</h2>
              <p className="mt-1 text-[13px] text-muted">{section.description}</p>
              <ul className="mt-4 space-y-2.5">
                {section.articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={docHref(section.slug, article.slug)}
                      className="group flex items-start justify-between gap-3 rounded-control px-3 py-2.5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-medium text-ink group-hover:text-primary">
                          {article.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">{article.excerpt}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted">{article.readingMinutes} mnt</span>
                    </Link>
                  </li>
                ))}
                {section.articles.length === 0 ? (
                  <li className="px-3 text-[13px] text-muted">Tidak ada artikel yang cocok.</li>
                ) : null}
              </ul>
            </Card>
          ))}
          {sections.length === 0 ? (
            <p className="text-sm text-muted">Tidak ada hasil untuk “{search}”.</p>
          ) : null}
        </div>
      )}

      <DemoNote className="mt-10">
        Dokumentasi ini berisi konten demo. Panduan IDE/CLI hanya mencantumkan aplikasi yang
        benar-benar diuji setelah integrasi backend.
      </DemoNote>
    </div>
  );
}

function docHref(sectionSlug: string, articleSlug: string): string {
  if (sectionSlug === "quickstart") return `/docs/quickstart`;
  if (sectionSlug === "ide") return `/docs/ide/${articleSlug}`;
  if (sectionSlug === "cli") return `/docs/cli/${articleSlug}`;
  return `/docs/quickstart`;
}
