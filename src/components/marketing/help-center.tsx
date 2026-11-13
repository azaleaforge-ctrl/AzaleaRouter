"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData, useDebounced } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";

export function HelpCenterClient() {
  const state = useApiData(() => api.content.listHelp(), []);
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 250).trim().toLowerCase();

  const grouped = useMemo(() => {
    const articles = (state.data ?? []).filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q),
    );
    const map = new Map<string, typeof articles>();
    for (const a of articles) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return Array.from(map.entries());
  }, [state.data, q]);

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        title="Help Center"
        description="Temukan jawaban tentang akun, wallet & pembayaran, model & harga, API key, integrasi, dan error API."
        actions={<DemoBadge label="Konten demo" />}
      />

      <div className="mb-10 max-w-lg">
        <Field label="Cari artikel bantuan">
          {({ id }) => (
            <Input id={id} type="search" placeholder="mis. top-up, api key, 401…" value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
        </Field>
      </div>

      {state.loading && state.data === null ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
          ))}
        </div>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {grouped.map(([category, articles]) => (
            <Card key={category} className="p-5">
              <h2 className="text-[15px] font-semibold text-ink">{category}</h2>
              <ul className="mt-3 space-y-1">
                {articles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/help/${a.slug}`}
                      className="block rounded-control px-3 py-2.5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="block text-[13.5px] font-medium text-ink">{a.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{a.excerpt}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {grouped.length === 0 ? (
            <p className="text-sm text-muted">Tidak ada artikel yang cocok dengan “{search}”.</p>
          ) : null}
        </div>
      )}

      <Card className="mt-10 p-6">
        <h2 className="text-[15px] font-semibold text-ink">Tidak menemukan jawaban?</h2>
        <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-muted">
          Pada produk final, kamu akan bisa mengirim tiket dukungan dan memantau nomor tiket
          beserta status penanganannya. Pada demo ini, alur tiket hanya tersedia sebagai
          simulasi di panel admin.
        </p>
        <DemoNote className="mt-4">
          Formulir kontak dan tiket nyata memerlukan backend dukungan — belum tersedia di demo.
        </DemoNote>
      </Card>
    </div>
  );
}
