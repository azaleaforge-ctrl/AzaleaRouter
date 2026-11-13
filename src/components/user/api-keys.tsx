"use client";

import { useState } from "react";
import type { ApiKey, ApiKeySecretReveal } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { apiKeyStatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { DemoBadge, DemoNote, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { CodeBlock } from "@/components/ui/code";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime, formatDateTime } from "@/lib/formatters";

export function ApiKeysClient() {
  const { toast } = useToast();
  const state = useApiData(() => api.apiKeys.list(), []);

  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reveal, setReveal] = useState<ApiKeySecretReveal | null>(null);
  const [saved, setSaved] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function resetCreate() {
    setCreateOpen(false);
    setLabel("");
    setLabelError(null);
    setSaved(false);
  }

  async function submitCreate() {
    if (!label.trim()) {
      setLabelError("Label key wajib diisi.");
      return;
    }
    setLabelError(null);
    setSubmitting(true);
    const res = await api.apiKeys.create({ label: label.trim() });
    setSubmitting(false);
    if (res.ok) {
      setCreateOpen(false);
      setReveal(res.data);
      setSaved(false);
      state.reload();
    } else {
      toast({ title: "Gagal membuat key demo", description: res.error.message, tone: "danger" });
    }
  }

  async function rotate(key: ApiKey) {
    setBusyId(key.id);
    const res = await api.apiKeys.rotate(key.id);
    setBusyId(null);
    if (res.ok) {
      setReveal(res.data);
      setSaved(false);
      state.reload();
      toast({ title: "Rotasi disimulasikan", description: "Key lama dicabut, key baru diterbitkan (demo).", tone: "primary" });
    } else {
      toast({ title: "Gagal rotasi", description: res.error.message, tone: "danger" });
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setBusyId(revokeTarget.id);
    const res = await api.apiKeys.revoke(revokeTarget.id);
    setBusyId(null);
    setRevokeTarget(null);
    setRevokeReason("");
    if (res.ok) {
      state.reload();
      toast({ title: "Key dicabut (simulasi)", description: "Perubahan hanya pada data demo lokal.", tone: "primary" });
    } else {
      toast({ title: "Gagal mencabut key", description: res.error.message, tone: "danger" });
    }
  }

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Key AzaleaRouter selalu berawalan AZL-. Secret lengkap hanya ditampilkan sekali saat dibuat — setelah itu hanya versi tersamarkan."
        actions={
          <>
            <DemoBadge label="Simulasi" />
            <Button onClick={() => setCreateOpen(true)}>Buat API key</Button>
          </>
        }
      />

      <Card>
        {state.loading && state.data === null ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : state.error ? (
          <CardContent>
            <ErrorState description={state.error} onRetry={state.reload} />
          </CardContent>
        ) : state.data && state.data.length === 0 ? (
          <EmptyState
            title="Belum ada API key"
            description="Buat API key demo pertamamu untuk mengikuti alur integrasi."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}>Buat API key</Button>}
          />
        ) : state.data ? (
          <TableWrap>
            <Table caption="Daftar API key (demo)">
              <THead>
                <TH>Label</TH>
                <TH>Key (tersamarkan)</TH>
                <TH>Status</TH>
                <TH>Terakhir dipakai</TH>
                <TH>Dibuat</TH>
                <TH className="text-right">Aksi</TH>
              </THead>
              <TBody>
                {state.data.map((key) => (
                  <TR key={key.id}>
                    <TD className="font-medium">{key.label}</TD>
                    <TD className="font-mono text-xs">{key.maskedKey}</TD>
                    <TD>{apiKeyStatusPill(key.status)}</TD>
                    <TD className="text-xs text-muted">
                      {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : "Belum pernah"}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(key.createdAt)}</TD>
                    <TD>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={busyId === key.id}
                          disabled={key.status === "revoked"}
                          onClick={() => rotate(key)}
                        >
                          Rotate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          disabled={key.status === "revoked"}
                          onClick={() => setRevokeTarget(key)}
                        >
                          Cabut
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        ) : null}
      </Card>

      <DemoNote className="mt-6">
        Key demo adalah token palsu (tokenKind: demo-non-usable) dan tidak dapat dipakai untuk
        request nyata. Pada produk final, secret disimpan sebagai hash — bukan plaintext — dan
        tidak pernah ditulis ke log atau telemetry.
      </DemoNote>

      {/* Create modal */}
      <Modal open={createOpen} onClose={resetCreate} title="Buat API key (demo)" description="Beri label untuk mengenali key ini.">
        <div className="space-y-4">
          <Field label="Label key" required error={labelError} hint="mis. Laptop kerja, CI pipeline, IDE kantor">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                value={label}
                invalid={invalid}
                aria-describedby={describedBy}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="mis. IDE kantor"
              />
            )}
          </Field>
          <Button className="w-full" loading={submitting} onClick={submitCreate}>
            Buat key
          </Button>
          <DemoNote>Key demo dibuat secara lokal — tidak ada kredensial nyata yang diterbitkan.</DemoNote>
        </div>
      </Modal>

      {/* One-time reveal modal */}
      <Modal
        open={reveal !== null}
        onClose={() => setReveal(null)}
        title="Simpan secret sekarang"
        description="Secret hanya ditampilkan satu kali dan tidak dapat dilihat kembali."
        size="lg"
      >
        {reveal ? (
          <div className="space-y-4">
            <div className="rounded-control border border-danger/40 bg-danger-soft px-4 py-3">
              <p className="text-[13px] font-semibold text-danger">{reveal.warning}</p>
              <p className="mt-1 text-xs leading-5 text-danger/90">
                Token ini sengaja tidak dapat dipakai (tokenKind: {reveal.tokenKind}). Jangan coba
                memakainya di aplikasi nyata.
              </p>
            </div>
            <CodeBlock code={reveal.secret} filename={`${reveal.key.label} — secret (sekali lihat)`} />
            <p className="text-[13px] text-muted">
              Versi tersamarkan di daftar: <span className="font-mono text-ink">{reveal.key.maskedKey}</span>
            </p>
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={saved}
                onChange={(e) => setSaved(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-[13px] leading-5 text-ink">
                Saya sudah menyimpan secret ini di tempat aman.
              </span>
            </label>
            <Button className="w-full" disabled={!saved} onClick={() => setReveal(null)}>
              Saya sudah simpan — tutup
            </Button>
          </div>
        ) : null}
      </Modal>

      {/* Revoke confirm modal */}
      <Modal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="Cabut API key?"
        description="Key yang dicabut langsung tidak dapat dipakai. Tindakan ini disimulasikan."
        size="sm"
      >
        {revokeTarget ? (
          <div className="space-y-4">
            <p className="text-[13px] leading-6 text-muted">
              Key <span className="font-semibold text-ink">{revokeTarget.label}</span> (
              <span className="font-mono">{revokeTarget.maskedKey}</span>) akan dicabut.
            </p>
            <Field label="Alasan (untuk audit demo)">
              {({ id }) => (
                <Input id={id} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} placeholder="mis. key tidak dipakai lagi" />
              )}
            </Field>
            <div className="flex gap-2">
              <Button variant="danger" className="flex-1" loading={busyId === revokeTarget.id} onClick={confirmRevoke}>
                Cabut key
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setRevokeTarget(null)}>
                Batal
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
