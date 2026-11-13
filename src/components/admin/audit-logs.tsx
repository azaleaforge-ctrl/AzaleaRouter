"use client";

import { useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD, Pagination } from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";

export function AdminAuditLogsClient() {
  const [page, setPage] = useState(1);
  const state = useApiData(() => api.admin.listAuditLogs({ page, pageSize: 15 }), [page]);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Setiap perubahan penting pada produk final tercatat dengan aktor, target, dan alasan."
        actions={<DemoBadge label="Data demo" />}
      />

      <Card>
        {state.loading && state.data === null ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : state.error ? (
          <CardContent>
            <ErrorState description={state.error} onRetry={state.reload} />
          </CardContent>
        ) : state.data ? (
          <>
            <TableWrap>
              <Table caption="Audit log demo">
                <THead>
                  <TH>Waktu</TH>
                  <TH>Aktor</TH>
                  <TH>Aksi</TH>
                  <TH>Target</TH>
                  <TH>Alasan</TH>
                </THead>
                <TBody>
                  {state.data.items.map((entry) => (
                    <TR key={entry.id}>
                      <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(entry.createdAt)}</TD>
                      <TD className="font-medium">{entry.actor}</TD>
                      <TD>
                        <Badge tone="outline" className="font-mono">
                          {entry.action}
                        </Badge>
                      </TD>
                      <TD className="max-w-48 truncate font-mono text-xs text-muted">{entry.target}</TD>
                      <TD className="max-w-64 truncate text-muted">{entry.reason}</TD>
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
        Audit log demo bersifat ilustratif. Pada produk final, entri audit dibuat otomatis oleh
        backend untuk setiap mutasi penting dan tidak dapat diedit.
      </DemoNote>
    </div>
  );
}
