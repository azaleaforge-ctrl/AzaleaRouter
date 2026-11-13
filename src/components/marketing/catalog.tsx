"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ModelCapability, ModelCategory, ModelSummary } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData, useDebounced } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, modelStatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { DemoBadge, DemoNote, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/table";
import { DeveloperLogo } from "@/components/ui/developer-logo";
import { formatCompactNumber, formatUsdPerMillion } from "@/lib/formatters";

const CATEGORY_LABELS: Record<ModelCategory, string> = {
  coding: "Coding",
  general: "General",
  reasoning: "Reasoning",
  vision: "Vision",
  audio: "Audio",
  embeddings: "Embeddings",
  specialist: "Spesialis",
};

const CAPABILITY_LABELS: Record<ModelCapability, string> = {
  streaming: "Streaming",
  "tool-calling": "Tool calling",
  vision: "Vision",
  "structured-output": "Structured output",
  reasoning: "Reasoning",
  "audio-input": "Audio input",
  embeddings: "Embeddings",
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Paling relevan" },
  { value: "popularity", label: "Populer" },
  { value: "name", label: "Nama A–Z" },
  { value: "input-price", label: "Harga input termurah" },
  { value: "output-price", label: "Harga output termurah" },
  { value: "context-window", label: "Context window terbesar" },
] as const;

const PAGE_SIZE = 9;

export function MarketplaceClient() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [category, setCategory] = useState<string>("");
  const [developerId, setDeveloperId] = useState<string>("");
  const [capability, setCapability] = useState<string>("");
  const [maxInputPrice, setMaxInputPrice] = useState("");
  const [maxOutputPrice, setMaxOutputPrice] = useState("");
  const [minContext, setMinContext] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>("relevance");
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      category: (category || undefined) as ModelCategory | undefined,
      developerId: developerId || undefined,
      capability: (capability || undefined) as ModelCapability | undefined,
      maxInputPrice: maxInputPrice ? Number(maxInputPrice) : undefined,
      maxOutputPrice: maxOutputPrice ? Number(maxOutputPrice) : undefined,
      minContextWindow: minContext ? Number(minContext) : undefined,
      onlyAvailable: onlyAvailable || undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, category, developerId, capability, maxInputPrice, maxOutputPrice, minContext, onlyAvailable, sort, page],
  );

  const state = useApiData(() => api.catalog.list(query), [query]);

  function resetFilters() {
    setSearch("");
    setCategory("");
    setDeveloperId("");
    setCapability("");
    setMaxInputPrice("");
    setMaxOutputPrice("");
    setMinContext("");
    setOnlyAvailable(false);
    setSort("relevance");
    setPage(1);
  }

  const hasFilters =
    search || category || developerId || capability || maxInputPrice || maxOutputPrice || minContext || onlyAvailable;

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        title="Model Marketplace"
        description="Bandingkan model berdasarkan pengembang, kemampuan, context window, dan harga per 1 juta token. Semua data berasal dari katalog demo."
        actions={<DemoBadge label="Katalog demo" />}
      />

      {/* Filters */}
      <Card className="mb-8 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cari model" className="sm:col-span-2">
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="search"
                placeholder="nama, model ID, atau pengembang…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-describedby={describedBy}
              />
            )}
          </Field>
          <Field label="Kategori">
            {({ id }) => (
              <Select
                id={id}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua kategori</option>
                {(state.data?.facets.categories ?? []).map((f) => (
                  <option key={f.value} value={f.value}>
                    {CATEGORY_LABELS[f.value]} ({f.count})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Pengembang">
            {({ id }) => (
              <Select
                id={id}
                value={developerId}
                onChange={(e) => {
                  setDeveloperId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua pengembang</option>
                {(state.data?.facets.developers ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.count})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Kemampuan">
            {({ id }) => (
              <Select
                id={id}
                value={capability}
                onChange={(e) => {
                  setCapability(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua kemampuan</option>
                {(state.data?.facets.capabilities ?? []).map((f) => (
                  <option key={f.value} value={f.value}>
                    {CAPABILITY_LABELS[f.value]} ({f.count})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Harga input maks (USD/1M)" hint="Kosongkan untuk tanpa batas">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="0.01"
                value={maxInputPrice}
                onChange={(e) => {
                  setMaxInputPrice(e.target.value);
                  setPage(1);
                }}
              />
            )}
          </Field>
          <Field label="Harga output maks (USD/1M)">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="0.01"
                value={maxOutputPrice}
                onChange={(e) => {
                  setMaxOutputPrice(e.target.value);
                  setPage(1);
                }}
              />
            )}
          </Field>
          <Field label="Context window minimum (token)">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                step="1000"
                value={minContext}
                onChange={(e) => {
                  setMinContext(e.target.value);
                  setPage(1);
                }}
              />
            )}
          </Field>
          <div className="flex items-end justify-between gap-3 sm:col-span-2 lg:col-span-2">
            <Switch
              checked={onlyAvailable}
              onChange={(v) => {
                setOnlyAvailable(v);
                setPage(1);
              }}
              label="Hanya model tersedia"
              description="Sembunyikan model limited, deprecated, dan unavailable."
            />
            <Field label="Urutkan" className="w-44 shrink-0">
              {({ id }) => (
                <Select id={id} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </div>
        {hasFilters ? (
          <div className="mt-4 border-t border-line pt-3">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset filter
            </Button>
          </div>
        ) : null}
      </Card>

      {/* Results */}
      {state.loading && state.data === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : state.data && state.data.page.items.length === 0 ? (
        <EmptyState
          title="Tidak ada model yang cocok"
          description="Coba longgarkan filter atau ubah kata kunci pencarian."
          action={
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Reset filter
            </Button>
          }
        />
      ) : state.data ? (
        <>
          <p className="mb-4 text-[13px] text-muted" aria-live="polite">
            Menampilkan {state.data.page.items.length} dari {state.data.page.total} model · ukuran
            katalog demo: {state.data.totalCatalogSize}
            {state.data.launchReady === false ? " (target launch 50+ model belum terpenuhi)" : ""}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.data.page.items.map((model) => (
              <li key={model.id}>
                <ModelCard model={model} />
              </li>
            ))}
          </ul>
          <Pagination
            className="mt-8"
            page={state.data.page.page}
            pageSize={state.data.page.pageSize}
            total={state.data.page.total}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <DemoNote className="mt-10">
        Katalog, harga, dan status model adalah data demo ilustratif dengan snapshot
        bertimestamp — bukan katalog atau penawaran nyata.
      </DemoNote>
    </div>
  );
}

function ModelCard({ model }: { model: ModelSummary }) {
  const [provider, modelId] = model.slug.includes("/") ? model.slug.split("/") : ["-", model.slug];
  return (
    <Card className="flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DeveloperLogo initials={model.developer.logoInitials} name={model.developer.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{model.name}</p>
            <p className="truncate text-xs text-muted">{model.developer.name}</p>
          </div>
        </div>
        {modelStatusPill(model.status)}
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-muted">{model.description}</p>

      <p className="mt-2 truncate font-mono text-[11px] text-muted/80">{model.id}</p>

      <dl className="mt-3 grid grid-cols-2 gap-3 rounded-control bg-surface-2/70 p-3 text-xs">
        <div>
          <dt className="text-muted">Input / 1M</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-ink">
            {formatUsdPerMillion(model.pricing.inputPerMillion)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Output / 1M</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-ink">
            {formatUsdPerMillion(model.pricing.outputPerMillion)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="outline">{CATEGORY_LABELS[model.category]}</Badge>
        {model.contextWindow ? (
          <Badge tone="outline">{formatCompactNumber(model.contextWindow)} konteks</Badge>
        ) : null}
        {model.isFree ? <Badge tone="teal">Free</Badge> : null}
        {model.isBudget ? <Badge tone="primary">Budget</Badge> : null}
        {model.isPreview ? <Badge tone="warning">Preview</Badge> : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
        <DemoBadge />
        <Link
          href={`/models/${provider}/${modelId}`}
          className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Lihat detail →
        </Link>
      </div>
    </Card>
  );
}
