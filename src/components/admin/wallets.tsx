"use client";

import { useState } from "react";
import type { AdminUser } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData, useDebounced } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/form";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD, Pagination } from "@/components/ui/table";
import { formatIDR } from "@/lib/formatters";

const STATUS_META: Record<AdminUser["status"], { label: string; tone: "teal" | "danger" | "warning" }> = {
  active: { label: "Aktif", tone: "teal" },
  suspended: { label: "Suspended", tone: "danger" },
  pending: { label: "Pending", tone: "warning" },
};

export function AdminWalletsClient() {
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [page, setPage] = useState(1);

  const state = useApiData(
    () => api.admin.listUsers({ search: q.trim() || undefined, page, pageSize: 10 }),
    [q, page],
  );

  return (
    <div>
      <PageHeader
        title="Wallets"
        description="Ringkasan saldo per pengguna dari data users demo."
        actions={<DemoBadge label="Data demo" />}
      />

      <Card className="mb-6 p-4 sm:p-5">
        <Field label="Cari pengguna">
          {({ id }) => (
            <Input
              id={id}
              type="search"
              placeholder="nama atau email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          )}
        </Field>
      </Card>

      <Card>
        {state.loading && state.data === null ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : state.error ? (
          <CardContent>
            <ErrorState description={state.error} onRetry={state.reload} />
          </CardContent>
        ) : state.data ? (
          <>
            <TableWrap>
              <Table caption="Saldo per pengguna (demo)">
                <THead>
                  <TH>Pengguna</TH>
                  <TH>Email</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Saldo (IDR)</TH>
                </THead>
                <TBody>
                  {state.data.items.map((u) => (
                    <TR key={u.id}>
                      <TD className="font-medium">{u.name}</TD>
                      <TD className="text-muted">{u.email}</TD>
                      <TD>
                        <StatusPill label={STATUS_META[u.status].label} tone={STATUS_META[u.status].tone} />
                      </TD>
                      <TD className="text-right font-medium tabular-nums">{formatIDR(u.balanceIdr)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <div className="border-t border-line p-4">
              <Pagination page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPageChange={setPage} />
            </div>
          </>
        ) : null}
      </Card>

      <DemoNote className="mt-6">
        Gap tercatat: inspeksi ledger lengkap (kredit, debit, reservasi, adjustment per entri)
        memerlukan kontrak admin wallets khusus. Admin tidak boleh mengedit debit historis —
        koreksi dilakukan lewat ledger adjustment baru.
      </DemoNote>
    </div>
  );
}
