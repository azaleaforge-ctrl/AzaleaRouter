"use client";

import Link from "next/link";
import { useState } from "react";
import type { ModelCategory } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData, useDebounced } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, modelStatusPill } from "@/components/ui/badge";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { DemoBadge, DemoNote, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD, Pagination } from "@/components/ui/table";
import { DeveloperLogo } from "@/components/ui/developer-logo";
import { formatUsdPerMillion } from "@/lib/formatters";

const CATEGORY_LABELS: Record<string, string> = {
  coding: "Coding",
  general: "General",
  reasoning: "Reasoning",
  vision: "Vision",
  audio: "Audio",
  embeddings: "Embeddings",
  specialist: "Spesialis",
};

export function AccountModelsClient() {
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [category, setCategory] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [page, setPage] = useState(1);

  const state = useApiData(
    () =>
      api.catalog.list({
        search: q.trim() || undefined,
        category: (category || undefined) as ModelCategory | undefined,
        onlyAvailable: onlyAvailable || undefined,
        page,
        pageSize: 10,
        sort: "popularity",
      }),
    [q, category, onlyAvailable, page],
  );

  return (
    <div>
      <PageHeader
        title="Models"
        description="Katalog model dalam konteks akun — pilih model untuk chat, playground, atau lihat detailnya."
        actions={<DemoBadge label="Katalog demo" />}
      />

      <Card className="mb-6 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cari" className="sm:col-span-2">
            {({ id }) => (
              <Input
                id={id}
                type="search"
                placeholder="nama model atau pengembang…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            )}
          </Field>
          <Field label="Kategori">
            {({ id }) => (
              <Select id={id} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">Semua</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="mt-4 border-t border-line pt-3">
          <Switch
            checked={onlyAvailable}
            onChange={(v) => {
              setOnlyAvailable(v);
              setPage(1);
            }}
            label="Hanya model tersedia"
            description="Model unavailable tidak bisa dipilih untuk request baru."
          />
        </div>
      </Card>

      <Card>
        {state.loading && state.data === null ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : state.error ? (
          <CardContent>
            <ErrorState description={state.error} onRetry={state.reload} />
          </CardContent>
        ) : state.data && state.data.page.items.length === 0 ? (
          <EmptyState title="Tidak ada model" description="Ubah filter atau kata kunci pencarian." />
        ) : state.data ? (
          <>
            <TableWrap>
              <Table caption="Katalog model akun (demo)">
                <THead>
                  <TH>Model</TH>
                  <TH>Kategori</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Input / 1M</TH>
                  <TH className="text-right">Output / 1M</TH>
                  <TH className="text-right">Aksi</TH>
                </THead>
                <TBody>
                  {state.data.page.items.map((m) => {
                    const [provider, modelId] = m.slug.includes("/") ? m.slug.split("/") : ["-", m.slug];
                    return (
                      <TR key={m.id}>
                        <TD>
                          <span className="flex items-center gap-2.5">
                            <DeveloperLogo initials={m.developer.logoInitials} name={m.developer.name} size={32} />
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-medium text-ink">{m.name}</span>
                              <span className="block truncate text-xs text-muted">{m.developer.name}</span>
                            </span>
                          </span>
                        </TD>
                        <TD>
                          <Badge tone="outline">{CATEGORY_LABELS[m.category] ?? m.category}</Badge>
                        </TD>
                        <TD>{modelStatusPill(m.status)}</TD>
                        <TD className="text-right tabular-nums">{formatUsdPerMillion(m.pricing.inputPerMillion)}</TD>
                        <TD className="text-right tabular-nums">{formatUsdPerMillion(m.pricing.outputPerMillion)}</TD>
                        <TD>
                          <div className="flex justify-end gap-1.5">
                            <Link
                              href={`/models/${provider}/${modelId}`}
                              className="rounded-control px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Detail
                            </Link>
                            <Link
                              href="/app/chat"
                              className="rounded-control px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Chat
                            </Link>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>
            <div className="border-t border-line p-4">
              <Pagination
                page={state.data.page.page}
                pageSize={state.data.page.pageSize}
                total={state.data.page.total}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : null}
      </Card>

      <DemoNote className="mt-6">
        Harga per 1M token dari snapshot demo. Detail lengkap (context window, kemampuan,
        endpoint) tersedia di halaman detail masing-masing model.
      </DemoNote>
    </div>
  );
}
