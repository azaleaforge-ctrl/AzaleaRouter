"use client";

import { useState } from "react";
import type { TransactionStatus, TransactionType } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, transactionStatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { DemoBadge, DemoNote, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD, Pagination } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatSignedIDR, formatDateTime } from "@/lib/formatters";

const TYPE_LABELS: Record<TransactionType, string> = {
  top_up: "Top-up",
  usage_debit: "Debit usage",
  refund: "Refund",
  adjustment: "Adjustment",
  reservation_release: "Lepas reservasi",
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  settled: "Settled",
  pending: "Pending",
  failed: "Gagal",
  reversed: "Reversed",
  pending_reconciliation: "Pending reconciliation",
};

const PAGE_SIZE = 10;

export function TransactionsClient() {
  const { toast } = useToast();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const state = useApiData(
    () =>
      api.wallet.listTransactions({
        type: (type || undefined) as TransactionType | undefined,
        status: (status || undefined) as TransactionStatus | undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [type, status, from, to, page],
  );

  function exportCsv() {
    const items = state.data?.items ?? [];
    if (items.length === 0) return;
    const header = "created_at,type,status,amount_idr,description,reference_id";
    const rows = items.map((t) =>
      [t.createdAt, t.type, t.status, t.amount, `"${t.description.replace(/"/g, '""')}"`, t.referenceId].join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transaksi-demo.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV demo diunduh", description: "Berisi data halaman aktif saja.", tone: "primary" });
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Riwayat kredit dan debit wallet. Transaksi lama tidak pernah dihapus — refund/reversal muncul sebagai entri baru."
        actions={
          <>
            <DemoBadge label="Data demo" />
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!state.data || state.data.items.length === 0}>
              Export CSV
            </Button>
          </>
        }
      />

      <Card className="mb-6 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Tipe transaksi">
            {({ id }) => (
              <Select id={id} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
                <option value="">Semua tipe</option>
                {(Object.keys(TYPE_LABELS) as TransactionType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Status">
            {({ id }) => (
              <Select id={id} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">Semua status</option>
                {(Object.keys(STATUS_LABELS) as TransactionStatus[]).map((t) => (
                  <option key={t} value={t}>
                    {STATUS_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Dari tanggal">
            {({ id }) => (
              <Input id={id} type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            )}
          </Field>
          <Field label="Sampai tanggal">
            {({ id }) => (
              <Input id={id} type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            )}
          </Field>
        </div>
      </Card>

      <Card>
        {state.loading && state.data === null ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : state.error ? (
          <CardContent>
            <ErrorState description={state.error} onRetry={state.reload} />
          </CardContent>
        ) : state.data && state.data.items.length === 0 ? (
          <EmptyState
            title="Tidak ada transaksi"
            description="Tidak ada transaksi demo yang cocok dengan filter ini."
          />
        ) : state.data ? (
          <>
            <TableWrap>
              <Table caption="Riwayat transaksi wallet (demo)">
                <THead>
                  <TH>Waktu</TH>
                  <TH>Deskripsi</TH>
                  <TH>Tipe</TH>
                  <TH>Status</TH>
                  <TH>Referensi</TH>
                  <TH className="text-right">Jumlah</TH>
                </THead>
                <TBody>
                  {state.data.items.map((tx) => (
                    <TR key={tx.id}>
                      <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(tx.createdAt)}</TD>
                      <TD className="max-w-64 truncate">{tx.description}</TD>
                      <TD>
                        <Badge tone="outline">{TYPE_LABELS[tx.type]}</Badge>
                      </TD>
                      <TD>{transactionStatusPill(tx.status)}</TD>
                      <TD className="font-mono text-xs text-muted">{tx.referenceId}</TD>
                      <TD className="text-right">
                        <span className={`font-medium tabular-nums ${tx.amount >= 0 ? "text-teal" : "text-ink"}`}>
                          {formatSignedIDR(tx.amount)}
                        </span>
                        <span className="sr-only">{tx.amount >= 0 ? " (kredit)" : " (debit)"}</span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <div className="border-t border-line p-4">
              <Pagination
                page={state.data.page}
                pageSize={state.data.pageSize}
                total={state.data.total}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : null}
      </Card>

      <DemoNote className="mt-6">
        Semua transaksi adalah data demo. Jumlah ditampilkan apa adanya dari fixture — perhitungan
        debit final tidak pernah dilakukan di browser.
      </DemoNote>
    </div>
  );
}
