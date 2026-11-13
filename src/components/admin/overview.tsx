"use client";

import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, StatCard } from "@/components/ui/card";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { BarList } from "@/components/charts/bars";
import { formatIDR, formatCompactNumber, formatPercent, formatDateTime } from "@/lib/formatters";

/** Plain USD display for aggregate amounts (formatters module exposes per-1M pricing only). */
function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function AdminOverviewClient() {
  const state = useApiData(() => api.admin.getOverview(), []);
  const o = state.data;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Ringkasan metrik operasional demo. Semua angka bersifat ilustratif."
        actions={<DemoBadge label="Metrik demo" />}
      />

      {state.loading && !o ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-28" />
            </Card>
          ))}
        </div>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : o ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Revenue (demo)" value={formatIDR(o.revenueIdr)} hint="Bukan laporan keuangan nyata" tone="primary" />
            <StatCard label="Total top-up" value={formatIDR(o.topUpIdr)} />
            <StatCard label="Total debit" value={formatIDR(o.debitIdr)} />
            <StatCard label="Margin (demo)" value={formatIDR(o.marginIdr)} tone="teal" />
            <StatCard label="Biaya upstream" value={formatUsd(o.upstreamCostUsd)} hint="Agregat demo USD" />
            <StatCard label="Requests" value={formatCompactNumber(o.requests)} />
            <StatCard label="Error rate" value={formatPercent(o.errorRatePercent)} tone="warning" />
            <StatCard label="Saldo tertahan" value={formatIDR(o.reservedBalanceIdr)} tone="warning" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-sm font-semibold text-ink">Sorotan operasional</h2>
                <BarList
                  formatValue={(v) => formatCompactNumber(v)}
                  items={[
                    { id: "users", label: "Pengguna aktif", value: o.activeUsers, hint: "demo" },
                    { id: "recon", label: "Pending reconciliation", value: o.pendingReconciliationCount, hint: "perlu ditinjau" },
                    { id: "requests", label: "Total request", value: o.requests },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3">
                <h2 className="text-sm font-semibold text-ink">Catatan data</h2>
                <p className="text-[13px] leading-6 text-muted">
                  Metrik revenue, margin, dan biaya upstream adalah nilai fixture. Pending
                  reconciliation menandakan transaksi demo yang menunggu data final upstream —
                  sistem tidak mengarang biaya final.
                </p>
                <p className="text-xs text-muted">Dibuat {formatDateTime(o.generatedAt)}</p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <DemoNote className="mt-6">
        Panel admin demo — tidak ada data produksi, ledger nyata, atau keputusan bisnis yang
        diambil dari angka di halaman ini.
      </DemoNote>
    </div>
  );
}
