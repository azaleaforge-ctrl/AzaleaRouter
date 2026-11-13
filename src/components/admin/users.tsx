"use client";

import { useState } from "react";
import type { AdminUser, AdminAuditEntry } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData, useDebounced } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD, Pagination } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatIDR, formatDate } from "@/lib/formatters";

const STATUS_META: Record<AdminUser["status"], { label: string; tone: "teal" | "danger" | "warning" }> = {
  active: { label: "Aktif", tone: "teal" },
  suspended: { label: "Suspended", tone: "danger" },
  pending: { label: "Pending", tone: "warning" },
};

export function AdminUsersClient() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const state = useApiData(
    () =>
      api.admin.listUsers({
        search: q.trim() || undefined,
        status: (status || undefined) as AdminUser["status"] | undefined,
        page,
        pageSize: 10,
      }),
    [q, status, page],
  );

  const [manageTarget, setManageTarget] = useState<AdminUser | null>(null);
  const [nextStatus, setNextStatus] = useState<"active" | "suspended">("suspended");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAudit, setLastAudit] = useState<AdminAuditEntry | null>(null);

  async function submitStatus() {
    if (!manageTarget) return;
    if (!reason.trim()) {
      setReasonError("Alasan wajib diisi untuk audit.");
      return;
    }
    setReasonError(null);
    setBusy(true);
    const res = await api.admin.setUserStatus({
      userId: manageTarget.id,
      status: nextStatus,
      reason: reason.trim(),
    });
    setBusy(false);
    if (res.ok) {
      setLastAudit(res.data.auditEntry);
      setManageTarget(null);
      setReason("");
      state.reload();
      toast({
        title: "Simulasi — perubahan hanya lokal",
        description: `${res.data.message} (applied: ${String(res.data.applied)})`,
        tone: "primary",
      });
    } else {
      toast({ title: "Gagal", description: res.error.message, tone: "danger" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Cari pengguna, lihat status akun, dan lakukan suspend/aktivasi. Semua mutasi disimulasikan."
        actions={<DemoBadge label="Simulasi" />}
      />

      <Card className="mb-6 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cari pengguna" className="sm:col-span-2">
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
          <Field label="Status">
            {({ id }) => (
              <Select id={id} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">Semua status</option>
                <option value="active">Aktif</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </Select>
            )}
          </Field>
        </div>
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
              <Table caption="Daftar pengguna (demo)">
                <THead>
                  <TH>Nama</TH>
                  <TH>Email</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Saldo</TH>
                  <TH>Terdaftar</TH>
                  <TH className="text-right">Aksi</TH>
                </THead>
                <TBody>
                  {state.data.items.map((u) => (
                    <TR key={u.id}>
                      <TD className="font-medium">{u.name}</TD>
                      <TD className="text-muted">{u.email}</TD>
                      <TD>
                        <Badge tone={u.role === "admin" ? "primary" : "outline"}>{u.role}</Badge>
                      </TD>
                      <TD>
                        <StatusPill label={STATUS_META[u.status].label} tone={STATUS_META[u.status].tone} />
                      </TD>
                      <TD className="text-right tabular-nums">{formatIDR(u.balanceIdr)}</TD>
                      <TD className="text-xs text-muted">{formatDate(u.createdAt)}</TD>
                      <TD>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setManageTarget(u);
                              setNextStatus(u.status === "active" ? "suspended" : "active");
                              setReason("");
                            }}
                          >
                            Kelola
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
        Suspend/unsuspend demo tidak mengubah akses nyata — demo role switching bukan batas
        keamanan.
      </DemoNote>

      <Modal
        open={manageTarget !== null}
        onClose={() => setManageTarget(null)}
        title="Ubah status pengguna (simulasi)"
        description={manageTarget ? `${manageTarget.name} — ${manageTarget.email}` : undefined}
        size="sm"
      >
        <div className="space-y-4">
          <Field label="Status baru">
            {({ id }) => (
              <Select id={id} value={nextStatus} onChange={(e) => setNextStatus(e.target.value as "active" | "suspended")}>
                <option value="active">Aktif</option>
                <option value="suspended">Suspended</option>
              </Select>
            )}
          </Field>
          <Field label="Alasan" required error={reasonError} hint="Dicatat pada audit log demo.">
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} value={reason} invalid={invalid} aria-describedby={describedBy} onChange={(e) => setReason(e.target.value)} placeholder="mis. pelanggaran fair use" />
            )}
          </Field>
          <div className="flex gap-2">
            <Button className="flex-1" loading={busy} onClick={submitStatus}>
              Terapkan (simulasi)
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setManageTarget(null)}>
              Batal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
