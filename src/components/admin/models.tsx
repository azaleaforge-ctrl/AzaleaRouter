"use client";

import { useState } from "react";
import type { AdminModelRow, AdminAuditEntry, ModelStatus } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData, useDebounced } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, modelStatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD, Pagination } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/formatters";

const STATUS_OPTIONS: Array<{ value: ModelStatus; label: string }> = [
  { value: "available", label: "Tersedia" },
  { value: "limited", label: "Terbatas" },
  { value: "deprecated", label: "Deprecated" },
  { value: "unavailable", label: "Tidak tersedia" },
];

export function AdminModelsClient() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [page, setPage] = useState(1);

  const state = useApiData(
    () => api.admin.listModels({ search: q.trim() || undefined, page, pageSize: 10 }),
    [q, page],
  );

  const [target, setTarget] = useState<AdminModelRow | null>(null);
  const [nextStatus, setNextStatus] = useState<ModelStatus>("available");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAudit, setLastAudit] = useState<AdminAuditEntry | null>(null);

  async function submit() {
    if (!target) return;
    if (!reason.trim()) {
      setReasonError("Alasan wajib diisi untuk audit.");
      return;
    }
    setReasonError(null);
    setBusy(true);
    const res = await api.admin.setModelStatus({ modelId: target.id, status: nextStatus, reason: reason.trim() });
    setBusy(false);
    if (res.ok) {
      setLastAudit(res.data.auditEntry);
      setTarget(null);
      setReason("");
      state.reload();
      toast({ title: "Simulasi — status model diubah secara lokal", description: res.data.message, tone: "primary" });
    } else {
      toast({ title: "Gagal", description: res.error.message, tone: "danger" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Models"
        description="Status katalog, kelayakan budget, dan waktu sinkronisasi terakhir. Sinkronisasi upstream disimulasikan."
        actions={<DemoBadge label="Simulasi" />}
      />

      <Card className="mb-6 p-4 sm:p-5">
        <Field label="Cari model">
          {({ id }) => (
            <Input
              id={id}
              type="search"
              placeholder="nama model atau pengembang…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          )}
        </Field>
      </Card>

      {lastAudit ? (
        <DemoNote className="mb-4">
          Entri audit demo terakhir: {lastAudit.actor} · {lastAudit.action} → {lastAudit.target} ·
          alasan: {lastAudit.reason}
        </DemoNote>
      ) : null}

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
        ) : state.data ? (
          <>
            <TableWrap>
              <Table caption="Katalog model admin (demo)">
                <THead>
                  <TH>Model</TH>
                  <TH>Pengembang</TH>
                  <TH>Status</TH>
                  <TH>Budget</TH>
                  <TH>Sinkron terakhir</TH>
                  <TH className="text-right">Aksi</TH>
                </THead>
                <TBody>
                  {state.data.items.map((m) => (
                    <TR key={m.id}>
                      <TD className="font-medium">{m.name}</TD>
                      <TD className="text-muted">{m.developerName}</TD>
                      <TD>{modelStatusPill(m.status)}</TD>
                      <TD>{m.budgetEligible ? <Badge tone="primary">Budget-eligible</Badge> : <span className="text-xs text-muted">—</span>}</TD>
                      <TD className="text-xs text-muted">{formatRelativeTime(m.lastSyncedAt)}</TD>
                      <TD>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTarget(m);
                              setNextStatus(m.status);
                              setReason("");
                            }}
                          >
                            Ubah status
                          </Button>
                        </div>
                      </TD>
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
        Sinkronisasi katalog nyata mengambil data dari upstream adapter dengan snapshot
        bertimestamp; kegagalan sync tidak boleh mengosongkan katalog aktif. Di demo, semuanya
        fixture lokal.
      </DemoNote>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Ubah status model (simulasi)"
        description={target ? target.name : undefined}
        size="sm"
      >
        <div className="space-y-4">
          <Field label="Status baru">
            {({ id }) => (
              <Select id={id} value={nextStatus} onChange={(e) => setNextStatus(e.target.value as ModelStatus)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Alasan" required error={reasonError} hint="Dicatat pada audit log demo.">
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} value={reason} invalid={invalid} aria-describedby={describedBy} onChange={(e) => setReason(e.target.value)} placeholder="mis. harga upstream berubah" />
            )}
          </Field>
          <div className="flex gap-2">
            <Button className="flex-1" loading={busy} onClick={submit}>
              Terapkan (simulasi)
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setTarget(null)}>
              Batal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
