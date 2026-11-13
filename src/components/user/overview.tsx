"use client";

import Link from "next/link";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { rangeToDateQuery } from "@/components/shared/range";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent, StatCard } from "@/components/ui/card";
import { transactionStatusPill } from "@/components/ui/badge";
import { DemoBadge, DemoNote, ConnectionBanner, Skeleton } from "@/components/ui/feedback";
import { ChartCard } from "@/components/charts/chart-card";
import { LineChart } from "@/components/charts/line";
import { TableWrap, Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { formatIDR, formatSignedIDR, formatCompactNumber, formatDateTime } from "@/lib/formatters";
import { shortDayLabel } from "@/components/shared/range";

const QUICK_ACTIONS = [
  { href: "/app/wallet", label: "Top-up saldo", desc: "Isi saldo (simulasi)" },
  { href: "/app/api-keys", label: "Buat API key", desc: "Terbitkan key demo" },
  { href: "/app/chat", label: "Buka AI Chat", desc: "Chat umum & coding" },
  { href: "/app/playground", label: "API Playground", desc: "Uji request" },
];

export function OverviewClient() {
  const profile = useApiData(() => api.settings.getProfile(), []);
  const wallet = useApiData(() => api.wallet.getSnapshot(), []);
  const range = rangeToDateQuery("7d");
  const usage = useApiData(() => api.usage.getSummary(range), []);
  const series = useApiData(() => api.usage.getSeries({ ...range, metric: "cost" }), []);
  const txs = useApiData(() => api.wallet.listTransactions({ page: 1, pageSize: 5 }), []);

  const loading = wallet.loading || usage.loading;
  const error = wallet.error ?? usage.error;

  return (
    <div>
      <PageHeader
        title={profile.data ? `Selamat datang, ${profile.data.name}` : "Overview"}
        description="Ringkasan akun demo: saldo, pemakaian 7 hari terakhir, dan aktivitas terbaru."
        actions={<DemoBadge label="Data demo" />}
      />

      {error ? <DemoNote className="mb-6">{error}</DemoNote> : null}
      {wallet.data ? <ConnectionBanner connection={wallet.data.connection} stale={wallet.data.stale} className="mb-6" /> : null}

      {/* Balance + usage stats */}
      {loading && !wallet.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-32" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Saldo tersedia"
            value={wallet.data ? formatIDR(wallet.data.availableBalance) : "—"}
            hint="Snapshot demo"
            tone="primary"
          />
          <StatCard
            label="Saldo tertahan"
            value={wallet.data ? formatIDR(wallet.data.reservedBalance) : "—"}
            hint="Reservasi request berjalan (demo)"
            tone="warning"
          />
          <StatCard
            label="Pengeluaran 7 hari"
            value={usage.data ? formatIDR(usage.data.totalSpend) : "—"}
            hint={usage.data ? "Provisional — bukan billing final" : undefined}
            tone="teal"
          />
          <StatCard
            label="Request 7 hari"
            value={usage.data ? formatCompactNumber(usage.data.totalRequests) : "—"}
            hint={usage.data?.topModel ? `Teratas: ${usage.data.topModel.name}` : undefined}
          />
        </div>
      )}

      {/* Chart + quick actions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ChartCard
          title="Biaya harian (7 hari)"
          description="Agregat demo — angka provisional, bukan debit final."
          table={
            <TableWrap>
              <Table caption="Biaya harian 7 hari terakhir (demo)">
                <THead>
                  <TH>Tanggal</TH>
                  <TH>Biaya</TH>
                </THead>
                <TBody>
                  {(series.data?.points ?? []).map((p) => (
                    <TR key={p.date}>
                      <TD>{shortDayLabel(p.date)}</TD>
                      <TD className="tabular-nums">{formatIDR(p.cost)}</TD>
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
              ariaLabel="Grafik biaya harian 7 hari terakhir"
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

        <Card>
          <CardHeader title="Aksi cepat" />
          <CardContent className="grid gap-2.5 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-control border border-line p-3.5 transition-colors hover:border-primary/50 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block text-[13px] font-semibold text-ink">{action.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{action.desc}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="mt-6">
        <CardHeader
          title="Transaksi terbaru"
          actions={
            <Link href="/app/transactions" className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Lihat semua →
            </Link>
          }
        />
        {txs.loading && !txs.data ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : txs.data && txs.data.items.length > 0 ? (
          <TableWrap>
            <Table caption="Lima transaksi terakhir (demo)">
              <THead>
                <TH>Waktu</TH>
                <TH>Deskripsi</TH>
                <TH>Status</TH>
                <TH className="text-right">Jumlah</TH>
              </THead>
              <TBody>
                {txs.data.items.map((tx) => (
                  <TR key={tx.id}>
                    <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(tx.createdAt)}</TD>
                    <TD className="max-w-56 truncate">{tx.description}</TD>
                    <TD>{transactionStatusPill(tx.status)}</TD>
                    <TD className={`text-right font-medium tabular-nums ${tx.amount >= 0 ? "text-teal" : "text-ink"}`}>
                      {formatSignedIDR(tx.amount)}
                      <span className="sr-only">{tx.amount >= 0 ? " (kredit)" : " (debit)"}</span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        ) : (
          <CardContent>
            <p className="text-sm text-muted">Belum ada transaksi demo.</p>
          </CardContent>
        )}
      </Card>

      <DemoNote className="mt-6">
        Semua angka di halaman ini adalah data demo ilustratif. Saldo final selalu bersumber dari
        snapshot backend — demo ini tidak menghitung debit nyata.
      </DemoNote>
    </div>
  );
}
