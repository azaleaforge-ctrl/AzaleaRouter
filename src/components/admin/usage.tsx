"use client";

import { useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { USAGE_RANGES, rangeToDateQuery, shortDayLabel, type UsageRange } from "@/components/shared/range";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, StatCard } from "@/components/ui/card";
import { Badge, billingStatusPill } from "@/components/ui/badge";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { TableWrap, Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { ChartCard } from "@/components/charts/chart-card";
import { LineChart } from "@/components/charts/line";
import { formatIDR, formatCompactNumber, formatTokenCount, formatDateTime } from "@/lib/formatters";

export function AdminUsageClient() {
  const [range, setRange] = useState<UsageRange>("7d");
  const query = rangeToDateQuery(range);

  const summary = useApiData(() => api.usage.getSummary(query), [range]);
  const series = useApiData(() => api.usage.getSeries({ ...query, metric: "cost" }), [range]);
  const requests = useApiData(() => api.usage.listRequests({ ...query, page: 1, pageSize: 10 }), [range]);

  const s = summary.data;

  return (
    <div>
      <PageHeader
        title="Usage"
        description="Monitoring pemakaian demo — agregat dari data usage pengguna demo, bukan monitoring produksi."
        actions={<DemoBadge label="Agregat demo" />}
      >
        <Tabs
          ariaLabel="Rentang waktu"
          tabs={USAGE_RANGES.map((r) => ({ id: r.id, label: r.label }))}
          active={range}
          onChange={(id) => setRange(id as UsageRange)}
          className="w-fit"
        />
      </PageHeader>

      {summary.error ? <DemoNote className="mb-6">{summary.error}</DemoNote> : null}

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
          <StatCard label="Total pengeluaran" value={formatIDR(s.totalSpend)} hint="Provisional (demo)" tone="primary" />
          <StatCard label="Total request" value={formatCompactNumber(s.totalRequests)} />
          <StatCard label="Token input" value={formatTokenCount(s.inputTokens)} hint={`Cached: ${formatTokenCount(s.cachedInputTokens)}`} />
          <StatCard label="Token output" value={formatTokenCount(s.outputTokens)} />
        </div>
      ) : null}

      <ChartCard
        className="mt-6"
        title="Biaya harian"
        description="Agregat demo per hari."
        table={
          <TableWrap>
            <Table caption="Biaya harian (demo)">
              <THead>
                <TH>Tanggal</TH>
                <TH>Biaya</TH>
                <TH>Request</TH>
              </THead>
              <TBody>
                {(series.data?.points ?? []).map((p) => (
                  <TR key={p.date}>
                    <TD>{shortDayLabel(p.date)}</TD>
                    <TD className="tabular-nums">{formatIDR(p.cost)}</TD>
                    <TD className="tabular-nums">{formatCompactNumber(p.requests)}</TD>
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
            ariaLabel="Grafik biaya harian demo"
            formatValue={(v) => formatIDR(v)}
            series={[
              {
                id: "cost",
                label: "Biaya",
                color: "var(--primary)",
                points: (series.data?.points ?? []).map((p) => ({ label: shortDayLabel(p.date), value: p.cost })),
              },
            ]}
          />
        )}
      </ChartCard>

      <Card className="mt-6">
        <CardContent>
          <h2 className="mb-3 text-sm font-semibold text-ink">Request terbaru</h2>
          {requests.loading && !requests.data ? (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : requests.error ? (
            <ErrorState description={requests.error} onRetry={requests.reload} />
          ) : (
            <TableWrap>
              <Table caption="Request terbaru (demo)">
                <THead>
                  <TH>Waktu</TH>
                  <TH>Model</TH>
                  <TH>Sumber</TH>
                  <TH className="text-right">Debit</TH>
                  <TH>Billing</TH>
                </THead>
                <TBody>
                  {(requests.data?.items ?? []).map((r) => (
                    <TR key={r.id}>
                      <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(r.createdAt)}</TD>
                      <TD className="max-w-40 truncate font-medium">{r.modelName}</TD>
                      <TD>
                        <Badge tone="outline">{r.source}</Badge>
                      </TD>
                      <TD className="text-right tabular-nums">{r.totalDebitIdr !== null ? formatIDR(r.totalDebitIdr) : "—"}</TD>
                      <TD>{billingStatusPill(r.billingStatus)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      <DemoNote className="mt-6">
        Monitoring error dan usage produksi memerlukan agregat khusus admin — kontrak tersebut
        belum tersedia di demo (gap tercatat).
      </DemoNote>
    </div>
  );
}
