"use client";

import { useMemo, useState } from "react";
import type { BillingStatus, ModelColor, UsageMetric, UsageRequest, UsageSource } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { USAGE_RANGES, rangeToDateQuery, shortDayLabel, type UsageRange } from "@/components/shared/range";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, billingStatusPill } from "@/components/ui/badge";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { TableWrap, Table, THead, TH, TBody, TR, TD, Pagination } from "@/components/ui/table";
import { ChartCard } from "@/components/charts/chart-card";
import { LineChart } from "@/components/charts/line";
import { DonutChart } from "@/components/charts/donut";
import { ChartLegend } from "@/components/charts/legend";
import { StatCard } from "@/components/ui/card";
import { formatIDR, formatCompactNumber, formatTokenCount, formatDateTime } from "@/lib/formatters";

/** Plain USD display for per-request upstream cost (formatters expose per-1M pricing only). */
function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

const METRICS: Array<{ id: UsageMetric; label: string }> = [
  { id: "cost", label: "Biaya" },
  { id: "requests", label: "Request" },
  { id: "input-tokens", label: "Input tokens" },
  { id: "output-tokens", label: "Output tokens" },
];

const SOURCE_LABELS: Record<UsageSource, string> = {
  website: "Website",
  ide: "IDE",
  cli: "CLI",
  "api-key": "API key",
  chat: "Chat",
  playground: "Playground",
};

const BILLING_LABELS: Record<BillingStatus, string> = {
  reserved: "Reserved",
  settled: "Settled",
  released: "Released",
  pending_reconciliation: "Pending reconciliation",
  refunded: "Refunded",
  failed_no_charge: "Failed / no charge",
};

const FALLBACK_COLORS = ["#4F83E5", "#2FA879", "#E16B6B", "#E6A23C", "#8B70C9", "#26A6A1", "#D46A9B", "#6F8F3D"] as const;
const DEFAULT_COLOR: string = FALLBACK_COLORS[0] ?? "#4F83E5";

function metricValue(point: { cost: number; requests: number; inputTokens: number; outputTokens: number }, metric: UsageMetric): number {
  switch (metric) {
    case "cost":
      return point.cost;
    case "requests":
      return point.requests;
    case "input-tokens":
      return point.inputTokens;
    case "output-tokens":
      return point.outputTokens;
  }
}

function formatMetric(v: number, metric: UsageMetric): string {
  if (metric === "cost") return formatIDR(v);
  if (metric === "requests") return formatCompactNumber(v);
  return formatTokenCount(v);
}

export function UsageClient() {
  const [range, setRange] = useState<UsageRange>("7d");
  const [metric, setMetric] = useState<UsageMetric>("cost");
  const query = rangeToDateQuery(range);

  const summary = useApiData(() => api.usage.getSummary(query), [range]);
  const series = useApiData(() => api.usage.getSeries({ ...query, metric }), [range, metric]);
  const colors = useApiData(() => api.usage.listModelColors(), []);
  const [requestsPage, setRequestsPage] = useState(1);
  const [filterModel, setFilterModel] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterBilling, setFilterBilling] = useState("");
  const requests = useApiData(
    () =>
      api.usage.listRequests({
        ...query,
        page: requestsPage,
        pageSize: 10,
        modelId: filterModel || undefined,
        source: (filterSource || undefined) as UsageSource | undefined,
        billingStatus: (filterBilling || undefined) as BillingStatus | undefined,
      }),
    [range, requestsPage, filterModel, filterSource, filterBilling],
  );
  // Separate wide fetch for the per-model donut (display aggregation of demo data only).
  const breakdownSource = useApiData(() => api.usage.listRequests({ ...query, page: 1, pageSize: 200 }), [range]);
  const [detail, setDetail] = useState<UsageRequest | null>(null);

  // Donut: aggregate fetched requests by model (display aggregation of demo data only).
  const breakdown = useMemo(() => {
    const map = new Map<string, { label: string; value: number }>();
    for (const r of breakdownSource.data?.items ?? []) {
      const cur = map.get(r.modelId) ?? { label: r.modelName, value: 0 };
      cur.value += r.totalDebitIdr ?? 0;
      map.set(r.modelId, cur);
    }
    return Array.from(map.entries())
      .map(([modelId, v]) => ({ modelId, ...v }))
      .sort((a, b) => b.value - a.value);
  }, [breakdownSource.data]);

  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of colors.data ?? []) map.set(c.modelId, c.colorHex);
    return (modelId: string): string => map.get(modelId) ?? DEFAULT_COLOR;
  }, [colors.data]);

  const donutData = breakdown.map((b) => ({ id: b.modelId, label: b.label, value: b.value, color: colorOf(b.modelId) }));
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  async function changeColor(modelId: string, colorHex: string) {
    const res = await api.usage.updateModelColor({ modelId, colorHex });
    if (res.ok) colors.reload();
  }

  const s = summary.data;

  return (
    <div>
      <PageHeader
        title="Usage Analytics"
        description="Model apa yang dipakai, kapan, berapa token, dan bagaimana saldo berubah. Zona waktu tampilan: Asia/Jakarta (WIB)."
        actions={<DemoBadge label="Provisional (demo)" />}
      >
        <Tabs
          ariaLabel="Rentang waktu"
          tabs={USAGE_RANGES.map((r) => ({ id: r.id, label: r.label }))}
          active={range}
          onChange={(id) => {
            setRange(id as UsageRange);
            setRequestsPage(1);
          }}
          className="w-fit"
        />
      </PageHeader>

      {summary.error ? <DemoNote className="mb-6">{summary.error}</DemoNote> : null}

      {/* Summary */}
      {summary.loading && !s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-28" />
            </Card>
          ))}
        </div>
      ) : s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total pengeluaran" value={formatIDR(s.totalSpend)} hint="Provisional — bukan billing final" tone="primary" />
          <StatCard label="Total request" value={formatCompactNumber(s.totalRequests)} hint={s.topModel ? `Teratas: ${s.topModel.name}` : undefined} />
          <StatCard
            label="Token input"
            value={formatTokenCount(s.inputTokens)}
            hint={`Cached: ${formatTokenCount(s.cachedInputTokens)}`}
            tone="teal"
          />
          <StatCard
            label="Token output"
            value={formatTokenCount(s.outputTokens)}
            hint={s.reasoningTokens !== null ? `Reasoning: ${formatTokenCount(s.reasoningTokens)}` : undefined}
          />
        </div>
      ) : null}

      {/* Time series */}
      <ChartCard
        className="mt-6"
        title="Time series"
        description="Nilai per hari sesuai metrik terpilih."
        actions={
          <Tabs
            ariaLabel="Metrik grafik"
            tabs={METRICS}
            active={metric}
            onChange={(id) => setMetric(id as UsageMetric)}
          />
        }
        table={
          <TableWrap>
            <Table caption="Nilai per hari (demo)">
              <THead>
                <TH>Tanggal</TH>
                <TH>Biaya</TH>
                <TH>Request</TH>
                <TH>Input</TH>
                <TH>Output</TH>
              </THead>
              <TBody>
                {(series.data?.points ?? []).map((p) => (
                  <TR key={p.date}>
                    <TD>{shortDayLabel(p.date)}</TD>
                    <TD className="tabular-nums">{formatIDR(p.cost)}</TD>
                    <TD className="tabular-nums">{formatCompactNumber(p.requests)}</TD>
                    <TD className="tabular-nums">{formatTokenCount(p.inputTokens)}</TD>
                    <TD className="tabular-nums">{formatTokenCount(p.outputTokens)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        }
      >
        {series.loading && !series.data ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <LineChart
            ariaLabel="Grafik pemakaian per hari"
            formatValue={(v) => formatMetric(v, metric)}
            series={[
              {
                id: metric,
                label: METRICS.find((m) => m.id === metric)?.label ?? metric,
                color: "var(--primary)",
                points: (series.data?.points ?? []).map((p) => ({
                  label: shortDayLabel(p.date),
                  value: metricValue(p, metric),
                })),
              },
            ]}
          />
        )}
      </ChartCard>

      {/* Donut per model + legend with color override */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <ChartCard
          title="Proporsi biaya per model"
          description="Agregat dari request demo pada periode terpilih."
          table={
            <TableWrap>
              <Table caption="Proporsi biaya per model (demo)">
                <THead>
                  <TH>Model</TH>
                  <TH className="text-right">Biaya</TH>
                </THead>
                <TBody>
                  {donutData.map((d) => (
                    <TR key={d.id}>
                      <TD>
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: d.color }} />
                          {d.label}
                        </span>
                      </TD>
                      <TD className="text-right tabular-nums">{formatIDR(d.value)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          }
        >
          {breakdownSource.loading && !breakdownSource.data ? (
            <Skeleton className="mx-auto" />
          ) : donutTotal > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <DonutChart
                data={donutData}
                formatValue={(v) => formatIDR(v)}
                centerValue={formatIDR(donutTotal)}
                centerLabel="total (demo)"
              />
              <ChartLegend
                items={donutData.map((d) => ({ id: d.id, label: d.label, color: d.color, visible: true }))}
              />
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted">Belum ada data biaya pada periode ini.</p>
          )}
        </ChartCard>

        <Card>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-ink">Warna model</h3>
              <p className="mt-1 text-[13px] leading-6 text-muted">
                Warna dipilih sekali per model dan konsisten di semua grafik. Kamu bisa menggantinya
                di sini — perubahan disimpan pada preferensi demo.
              </p>
            </div>
            {colors.loading && !colors.data ? (
              <Skeleton className="h-24 w-full" />
            ) : (colors.data ?? []).length === 0 ? (
              <p className="text-[13px] text-muted">Belum ada model dengan warna tersimpan.</p>
            ) : (
              <ul className="space-y-2">
                {(colors.data as ModelColor[]).map((c) => (
                  <li key={c.modelId} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full" style={{ background: c.colorHex }} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink">{c.modelName}</span>
                        <span className="block truncate font-mono text-[11px] text-muted">{c.modelId}</span>
                      </span>
                    </span>
                    <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
                      Ganti
                      <input
                        type="color"
                        aria-label={`Ganti warna untuk ${c.modelName}`}
                        defaultValue={c.colorHex}
                        onBlur={(e) => {
                          if (e.target.value.toLowerCase() !== c.colorHex.toLowerCase()) {
                            void changeColor(c.modelId, e.target.value);
                          }
                        }}
                        className="size-7 cursor-pointer rounded border border-line bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <DemoNote>
              Warna disimpan per kombinasi pengguna + model dan tidak diacak ulang saat render —
              pada demo, penyimpanan dilakukan oleh mock service.
            </DemoNote>
          </CardContent>
        </Card>
      </div>

      {/* Requests table */}
      <Card className="mt-6">
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select aria-label="Filter model" value={filterModel} onChange={(e) => { setFilterModel(e.target.value); setRequestsPage(1); }}>
              <option value="">Semua model</option>
              {breakdown.map((b) => (
                <option key={b.modelId} value={b.modelId}>
                  {b.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter sumber" value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setRequestsPage(1); }}>
              <option value="">Semua sumber</option>
              {(Object.keys(SOURCE_LABELS) as UsageSource[]).map((src) => (
                <option key={src} value={src}>
                  {SOURCE_LABELS[src]}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter status billing" value={filterBilling} onChange={(e) => { setFilterBilling(e.target.value); setRequestsPage(1); }}>
              <option value="">Semua status billing</option>
              {(Object.keys(BILLING_LABELS) as BillingStatus[]).map((b) => (
                <option key={b} value={b}>
                  {BILLING_LABELS[b]}
                </option>
              ))}
            </Select>
          </div>

          {requests.loading && !requests.data ? (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : requests.error ? (
            <ErrorState description={requests.error} onRetry={requests.reload} />
          ) : requests.data && requests.data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Tidak ada request pada filter ini.</p>
          ) : requests.data ? (
            <>
              <TableWrap>
                <Table caption="Daftar request (demo)">
                  <THead>
                    <TH>Waktu</TH>
                    <TH>Model</TH>
                    <TH>Sumber</TH>
                    <TH className="text-right">Token</TH>
                    <TH className="text-right">Debit</TH>
                    <TH>Billing</TH>
                  </THead>
                  <TBody>
                    {requests.data.items.map((r) => (
                      <TR key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                        <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(r.createdAt)}</TD>
                        <TD>
                          <span className="flex items-center gap-2">
                            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(r.modelId) }} />
                            <span className="max-w-40 truncate font-medium">{r.modelName}</span>
                          </span>
                        </TD>
                        <TD>
                          <Badge tone="outline">{SOURCE_LABELS[r.source]}</Badge>
                        </TD>
                        <TD className="text-right text-xs tabular-nums text-muted">
                          {formatCompactNumber(r.inputTokens)} → {formatCompactNumber(r.outputTokens)}
                        </TD>
                        <TD className="text-right font-medium tabular-nums">
                          {r.totalDebitIdr !== null ? formatIDR(r.totalDebitIdr) : "—"}
                        </TD>
                        <TD>{billingStatusPill(r.billingStatus)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
              <Pagination
                page={requests.data.page}
                pageSize={requests.data.pageSize}
                total={requests.data.total}
                onPageChange={setRequestsPage}
              />
              <p className="text-xs text-muted">Klik baris untuk melihat detail request.</p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <DemoNote className="mt-6">
        Angka provisional dan final dibedakan secara tekstual. Demo ini tidak menghitung debit
        final — settlement terjadi di backend.
      </DemoNote>

      {/* Request detail modal */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title="Detail request (demo)" size="lg">
        {detail ? (
          <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
            {[
              ["Request ID", detail.id],
              ["Waktu", formatDateTime(detail.createdAt)],
              ["Model", `${detail.modelName} (${detail.modelId})`],
              ["Pengembang", detail.developerName],
              ["Endpoint provider", detail.endpointProvider ?? "Tidak tersedia"],
              ["API key", detail.apiKeyLabel ?? "Tidak tersedia"],
              ["Sumber", SOURCE_LABELS[detail.source]],
              ["Input tokens", formatCompactNumber(detail.inputTokens)],
              ["Cached tokens", formatCompactNumber(detail.cachedTokens)],
              ["Output tokens", formatCompactNumber(detail.outputTokens)],
              ["Reasoning tokens", detail.reasoningTokens !== null ? formatCompactNumber(detail.reasoningTokens) : "Tidak tersedia"],
              ["Biaya upstream", detail.upstreamCostUsd !== null ? formatUsd(detail.upstreamCostUsd) : "Tidak tersedia"],
              ["Kurs USD/IDR", detail.fxRateUsdIdr !== null ? String(detail.fxRateUsdIdr) : "Tidak tersedia"],
              ["Markup", detail.markupPercent !== null ? `${detail.markupPercent}%` : "Tidak tersedia"],
              ["Total debit", detail.totalDebitIdr !== null ? formatIDR(detail.totalDebitIdr) : "Tidak tersedia"],
              ["Routing preference", detail.routingPreference ?? "Tidak tersedia"],
              ["Fallback", detail.fallbackUsed === null ? "Tidak tersedia" : detail.fallbackUsed ? "Digunakan" : "Tidak"],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between gap-4 border-b border-line pb-2">
                <dt className="shrink-0 text-muted">{label}</dt>
                <dd className="text-right font-medium text-ink">{value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-b border-line pb-2 sm:col-span-2">
              <dt className="text-muted">Status billing</dt>
              <dd>{billingStatusPill(detail.billingStatus)}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
