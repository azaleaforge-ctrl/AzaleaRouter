"use client";

import { useState } from "react";
import type { AdminPaymentRow } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill, type BadgeTone } from "@/components/ui/badge";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD, Pagination } from "@/components/ui/table";
import { formatIDR, formatDateTime } from "@/lib/formatters";

const STATUS_META: Record<AdminPaymentRow["status"], { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "warning" },
  paid: { label: "Paid", tone: "teal" },
  failed: { label: "Gagal", tone: "danger" },
  expired: { label: "Kedaluwarsa", tone: "neutral" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export function AdminPaymentsClient() {
  const [page, setPage] = useState(1);
  const state = useApiData(() => api.admin.listPayments({ page, pageSize: 10 }), [page]);

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Transaksi pembayaran demo. Payment pending tidak pernah menambah saldo; webhook duplikat tidak menggandakan saldo."
        actions={<DemoBadge label="Data demo" />}
      />

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
        ) : (
          <>
            <TableWrap>
              <Table caption="Transaksi pembayaran (demo)">
                <THead>
                  <TH>ID</TH>
                  <TH>Pengguna</TH>
                  <TH className="text-right">Jumlah</TH>
                  <TH>Metode</TH>
                  <TH>Status</TH>
                  <TH>Waktu</TH>
                </THead>
                <TBody>
                  {(state.data?.items ?? []).map((p) => (
                    <TR key={p.id}>
                      <TD className="font-mono text-xs">{p.id}</TD>
                      <TD className="text-muted">{p.userId}</TD>
                      <TD className="text-right font-medium tabular-nums">{formatIDR(p.amountIdr)}</TD>
                      <TD className="text-muted">{p.method}</TD>
                      <TD>
                        <StatusPill label={STATUS_META[p.status].label} tone={STATUS_META[p.status].tone} />
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(p.createdAt)}</TD>
                    </TR>
                  ))}
                  {(state.data?.items.length ?? 0) === 0 ? (
                    <TR>
                      <TD className="py-8 text-center text-muted" colSpan={6}>
                        Belum ada pembayaran demo.
                      </TD>
                    </TR>
                  ) : null}
                </TBody>
              </Table>
            </TableWrap>
            <div className="border-t border-line p-4">
              {state.data ? (
                <Pagination page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPageChange={setPage} />
              ) : null}
            </div>
          </>
        )}
      </Card>

      <DemoNote className="mt-6">
        Log webhook dan verifikasi signature terjadi di backend — demo ini tidak menerima atau
        memproses webhook nyata.
      </DemoNote>
    </div>
  );
}
