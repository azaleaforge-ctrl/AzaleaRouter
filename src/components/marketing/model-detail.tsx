"use client";

import Link from "next/link";
import { use, useState } from "react";
import type { ModelEndpoint, RoutingMode } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge, modelStatusPill } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { DemoBadge, DemoNote, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code";
import { DeveloperLogo } from "@/components/ui/developer-logo";
import { formatCompactNumber, formatTokenRate, formatUsdPerMillion, formatDateTime } from "@/lib/formatters";

/**
 * Documentation sample only. `.example` is reserved and never resolves to a
 * live service. Replace with the confirmed production base URL (or
 * NEXT_PUBLIC_AZALEA_API_BASE_URL) before use.
 */
const SAMPLE_API_BASE_URL = "https://api.azalearouter.example/v1";

const ROUTING_LABELS: Record<RoutingMode, string> = {
  auto: "Otomatis (auto)",
  cheapest: "Termurah",
  fastest: "Tercepat",
  "lowest-latency": "Latensi terendah",
  "specific-provider": "Provider tertentu",
  "provider-priority": "Prioritas provider",
  fallback: "Fallback",
};

const CATEGORY_LABELS: Record<string, string> = {
  coding: "Coding",
  general: "General",
  reasoning: "Reasoning",
  vision: "Vision",
  audio: "Audio",
  embeddings: "Embeddings",
  specialist: "Spesialis",
};

function snippets(modelId: string) {
  const base = SAMPLE_API_BASE_URL;
  return {
    curl: `curl ${base}/chat/completions \\\n  -H "Authorization: Bearer $AZALEA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${modelId}",\n    "messages": [{ "role": "user", "content": "Halo!" }]\n  }'`,
    javascript: `const res = await fetch("${base}/chat/completions", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.AZALEA_API_KEY}\`,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({\n    model: "${modelId}",\n    messages: [{ role: "user", content: "Halo!" }],\n  }),\n});\nconst data = await res.json();`,
    python: `import os, requests\n\nres = requests.post(\n    "${base}/chat/completions",\n    headers={"Authorization": f"Bearer {os.environ['AZALEA_API_KEY']}"},\n    json={\n        "model": "${modelId}",\n        "messages": [{"role": "user", "content": "Halo!"}],\n    },\n)\nprint(res.json())`,
  };
}

export function ModelDetailClient({ params }: { params: Promise<{ provider: string; model: string }> }) {
  const { provider, model } = use(params);
  const state = useApiData(() => api.catalog.getDetail(provider, model), [provider, model]);
  const [endpointId, setEndpointId] = useState<string | null>(null);

  if (state.loading && state.data === null) {
    return (
      <div className="container-page space-y-6 py-10" aria-busy="true" aria-label="Memuat detail model">
        <Skeleton className="h-8 w-80" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="container-page py-16">
        <ErrorState description={state.error} onRetry={state.reload} />
      </div>
    );
  }

  if (!state.data) {
    return (
      <div className="container-page py-16">
        {state.errorCode === "NOT_FOUND" ? (
          <EmptyState
            title="Model tidak ditemukan"
            description="Model ini tidak ada di katalog demo atau telah dinonaktifkan."
            action={
              <Link href="/models" className={buttonClasses("secondary", "sm")}>
                ← Kembali ke katalog
              </Link>
            }
          />
        ) : (
          <ErrorState description={state.error} onRetry={state.reload} />
        )}
      </div>
    );
  }

  const m = state.data;
  const selected: ModelEndpoint | null =
    m.endpoints.find((e) => e.id === endpointId) ?? m.endpoints[0] ?? null;
  const samples = snippets(m.id);

  return (
    <div className="container-page py-10 sm:py-14">
      {/* Header */}
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-muted">
        <Link href="/models" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Models
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{m.name}</span>
      </nav>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <DeveloperLogo initials={m.developer.logoInitials} name={m.developer.name} size={44} />
            <span>{m.name}</span>
            {modelStatusPill(m.status)}
            {m.isFree ? <Badge tone="teal">Free</Badge> : null}
            {m.isBudget ? <Badge tone="primary">Budget</Badge> : null}
            {m.isPreview ? <Badge tone="warning">Preview</Badge> : null}
          </span>
        }
        description={m.description}
        actions={<DemoBadge label="Data demo" />}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
          <span>
            Model ID: <span className="font-mono text-ink">{m.id}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Pengembang: <span className="text-ink">{m.developer.name}</span>
            {m.developer.verified ? " (terverifikasi)" : ""}
          </span>
          <span aria-hidden="true">·</span>
          <span>{CATEGORY_LABELS[m.category] ?? m.category}</span>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Kemampuan & spesifikasi" description="Detail yang tidak tersedia diberi label, bukan ditebak." />
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {m.capabilities.length > 0 ? (
                  m.capabilities.map((cap) => (
                    <Badge key={cap} tone="primary">
                      {cap}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[13px] text-muted">Tidak tersedia</span>
                )}
              </div>
              <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                {[
                  ["Context window", m.contextWindow ? `${formatCompactNumber(m.contextWindow)} token` : null],
                  ["Max output", m.maxOutputTokens ? `${formatCompactNumber(m.maxOutputTokens)} token` : null],
                  ["Modalitas", m.modalities.length > 0 ? m.modalities.join(", ") : null],
                  ["Tokenizer", m.tokenizer],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between gap-4 border-b border-line pb-2">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right font-medium text-ink">{value ?? "Tidak tersedia"}</dd>
                  </div>
                ))}
              </dl>
              {m.useCases.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-ink">Use case yang cocok</h3>
                  <ul className="list-disc space-y-1 pl-5 text-[13px] leading-6 text-muted">
                    {m.useCases.map((uc) => (
                      <li key={uc}>{uc}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {m.dataPolicy ? (
                <DemoNote>
                  <span>
                    <strong className="font-medium text-ink">Kebijakan data (demo):</strong> {m.dataPolicy}
                  </span>
                </DemoNote>
              ) : null}
            </CardContent>
          </Card>

          {/* Endpoints + routing */}
          <Card>
            <CardHeader
              title="Endpoint & routing"
              description="Daftar endpoint adalah kandidat dari katalog demo — bukan jaminan provider tertentu melayani setiap request."
            />
            <CardContent className="space-y-3">
              {m.endpoints.length === 0 ? (
                <p className="text-[13px] text-muted">Tidak tersedia</p>
              ) : (
                <fieldset>
                  <legend className="mb-2 text-[13px] font-medium text-ink">Pilih endpoint provider</legend>
                  <div className="space-y-2">
                    {m.endpoints.map((ep) => {
                      const disabled = ep.status === "unavailable";
                      const active = selected?.id === ep.id;
                      return (
                        <label
                          key={ep.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-control border p-3 transition-colors ${
                            active ? "border-primary bg-primary-soft/50" : "border-line hover:bg-surface-2/60"
                          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <input
                            type="radio"
                            name="endpoint"
                            value={ep.id}
                            checked={active}
                            disabled={disabled}
                            onChange={() => setEndpointId(ep.id)}
                            className="mt-1 size-4 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-[13px] font-semibold text-ink">{ep.provider}</span>
                              {ep.status === "available" ? (
                                <Badge tone="teal">Tersedia</Badge>
                              ) : ep.status === "limited" ? (
                                <Badge tone="warning">Terbatas</Badge>
                              ) : (
                                <Badge tone="danger">Tidak tersedia</Badge>
                              )}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                              <span>Latensi: {ep.latencyMs !== null ? `${ep.latencyMs} ms` : "Tidak tersedia"}</span>
                              <span>Throughput: {formatTokenRate(ep.throughputTokensPerSecond)}</span>
                              <span>Streaming: {ep.supportsStreaming ? "didukung" : "tidak"}</span>
                            </span>
                            {disabled ? (
                              <span className="mt-1 block text-xs text-danger">
                                Endpoint ini tidak dapat dipilih untuk request baru.
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              {selected ? (
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-ink">Mode routing yang didukung endpoint ini</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.routingModes.length > 0 ? (
                      selected.routingModes.map((rm) => (
                        <Badge key={rm} tone="outline">
                          {ROUTING_LABELS[rm]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[13px] text-muted">Tidak tersedia</span>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Harga (snapshot demo)"
              description={`Diperbarui ${formatDateTime(m.pricing.updatedAt)} · Snapshot: ${m.pricing.snapshotId}`}
            />
            <CardContent className="space-y-3">
              <dl className="space-y-2.5 text-[13px]">
                {[
                  ["Input", m.pricing.inputPerMillion],
                  ["Output", m.pricing.outputPerMillion],
                  ["Cached input", m.pricing.cachedInputPerMillion],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between gap-4 border-b border-line pb-2">
                    <dt className="text-muted">{label} / 1M token</dt>
                    <dd className="font-semibold tabular-nums text-ink">{formatUsdPerMillion(value as number | null)}</dd>
                  </div>
                ))}
              </dl>
              <DemoNote>
                Harga dalam USD per 1 juta token dari snapshot demo. Konversi IDR dan debit final
                dihitung backend — bukan di browser.
              </DemoNote>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Contoh request" description="Ganti $AZALEA_API_KEY dengan API key demo-mu." />
            <CardContent>
              <SnippetTabs samples={samples} />
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Link href="/app/playground" className={buttonClasses("primary", "md")}>
              Coba di Playground
            </Link>
            <Link href="/models" className={buttonClasses("secondary", "md")}>
              ← Kembali ke katalog
            </Link>
          </div>
        </div>
      </div>

      <DemoNote className="mt-10">
        Seluruh detail halaman ini adalah data demo. Tidak ada klaim ketersediaan, harga, atau
        dukungan fitur yang telah diverifikasi.
      </DemoNote>
    </div>
  );
}

function SnippetTabs({ samples }: { samples: { curl: string; javascript: string; python: string } }) {
  const [tab, setTab] = useState("curl");
  return (
    <div className="space-y-3">
      <Tabs
        ariaLabel="Bahasa contoh kode"
        tabs={[
          { id: "curl", label: "cURL" },
          { id: "javascript", label: "JavaScript" },
          { id: "python", label: "Python" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <CodeBlock
        code={samples[tab as keyof typeof samples]}
        filename={tab === "curl" ? "terminal" : tab === "javascript" ? "request.js" : "request.py"}
      />
    </div>
  );
}
