"use client";

import Link from "next/link";
import { useState } from "react";
import type { TopUpMethod, TopUpSimulation } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { DemoBadge, DemoNote, ConnectionBanner, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { formatIDR, formatDateTime } from "@/lib/formatters";

const PRESETS = [50000, 100000, 250000, 500000];

const METHOD_LABELS: Record<TopUpMethod, string> = {
  qris: "QRIS",
  "virtual-account": "Virtual Account",
  "bank-transfer": "Transfer Bank",
  "e-wallet": "E-Wallet",
};

export function WalletClient() {
  const { toast } = useToast();
  const snapshot = useApiData(() => api.wallet.getSnapshot(), []);
  const txs = useApiData(() => api.wallet.listTransactions({ page: 1, pageSize: 5 }), []);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amount, setAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<TopUpMethod>("qris");
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [result, setResult] = useState<TopUpSimulation | null>(null);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  async function submitTopUp() {
    if (!Number.isFinite(effectiveAmount) || effectiveAmount < 50000) {
      setAmountError("Minimum top-up Rp50.000.");
      return;
    }
    setAmountError(null);
    setSubmitting(true);
    const res = await api.wallet.createTopUp({ amount: effectiveAmount, method });
    setSubmitting(false);
    if (res.ok) {
      setResult(res.data);
      toast({
        title: "Simulasi top-up dibuat",
        description: "Tidak ada payment intent nyata — status tetap demo.",
        tone: "primary",
      });
      snapshot.reload();
      txs.reload();
    } else {
      toast({ title: "Gagal membuat top-up demo", description: res.error.message, tone: "danger" });
    }
  }

  const s = snapshot.data;

  return (
    <div>
      <PageHeader
        title="Wallet & Top-up"
        description="Saldo tersedia, saldo tertahan, dan alur top-up. Seluruh pembayaran di demo hanya disimulasikan."
        actions={
          <>
            <DemoBadge label="Simulasi" />
            <Button onClick={() => { setTopUpOpen(true); setResult(null); }}>Top-up saldo</Button>
          </>
        }
      />

      {s ? <ConnectionBanner connection={s.connection} stale={s.stale} className="mb-6" /> : null}
      {snapshot.error ? <DemoNote className="mb-6">{snapshot.error}</DemoNote> : null}

      {snapshot.loading && !s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-32" />
            </Card>
          ))}
        </div>
      ) : s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Saldo tersedia" value={formatIDR(s.availableBalance)} hint="Snapshot demo" tone="primary" />
          <StatCard label="Saldo tertahan" value={formatIDR(s.reservedBalance)} hint="Reservasi request berjalan" tone="warning" />
          <StatCard label="Total top-up" value={formatIDR(s.totalTopUp)} hint="Akumulasi demo" />
          <StatCard label="Total debit" value={formatIDR(s.totalDebit)} hint="Akumulasi demo" tone="teal" />
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted">
        Diperbarui {s ? formatDateTime(s.updatedAt) : "—"} · mata uang IDR · sistem prepaid pay-as-you-go
      </p>

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
          <CardContent className="divide-y divide-line">
            {txs.data.items.map((tx) => (
              <div key={tx.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{tx.description}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(tx.createdAt)} · ref <span className="font-mono">{tx.referenceId}</span>
                  </p>
                </div>
                <p className={`text-[13px] font-semibold tabular-nums ${tx.amount >= 0 ? "text-teal" : "text-ink"}`}>
                  {formatIDR(tx.amount)}
                </p>
              </div>
            ))}
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted">Belum ada transaksi demo.</p>
          </CardContent>
        )}
      </Card>

      <DemoNote className="mt-6">
        Alur top-up nyata memerlukan payment intent backend, webhook terverifikasi, dan ledger
        entry — semuanya di luar lingkup demo. Browser redirect tidak pernah dianggap bukti
        pembayaran sukses.
      </DemoNote>

      {/* Top-up modal */}
      <Modal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title="Top-up saldo (simulasi)"
        description="Pilih nominal dan metode. Tidak ada pembayaran nyata yang diproses."
        size="md"
      >
        {result ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">Status top-up demo</p>
              <Badge tone={result.status === "simulated_completed" ? "teal" : result.status === "simulated_failed" ? "danger" : "warning"} dot>
                {result.status === "simulated_completed"
                  ? "Selesai (simulasi)"
                  : result.status === "simulated_failed"
                    ? "Gagal (simulasi)"
                    : "Menunggu (simulasi)"}
              </Badge>
            </div>
            <p className="rounded-control bg-surface-2 px-3 py-2.5 text-[13px] leading-6 text-muted">{result.message}</p>
            <ol className="space-y-2.5">
              {result.timeline.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.done ? "bg-teal-soft text-teal" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {step.done ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{step.label}</span>
                    <span className="block text-xs text-muted">{formatDateTime(step.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
            <DemoNote>
              Status “selesai” di sini adalah status simulasi — saldo demo hanya berubah di data
              mock lokal, bukan ledger nyata.
            </DemoNote>
            <Button variant="secondary" className="w-full" onClick={() => setTopUpOpen(false)}>
              Tutup
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-ink">Pilih nominal</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={!customAmount && amount === preset}
                    onClick={() => {
                      setAmount(preset);
                      setCustomAmount("");
                      setAmountError(null);
                    }}
                    className={`rounded-control border px-3 py-2.5 text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      !customAmount && amount === preset
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-line bg-surface text-ink hover:bg-surface-2"
                    }`}
                  >
                    {formatIDR(preset)}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="Nominal custom (IDR)" error={amountError} hint="Minimum Rp50.000">
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="number"
                  min={50000}
                  step={1000}
                  placeholder="mis. 75000"
                  value={customAmount}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
              )}
            </Field>
            <Field label="Metode pembayaran">
              {({ id }) => (
                <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as TopUpMethod)}>
                  {(Object.keys(METHOD_LABELS) as TopUpMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {METHOD_LABELS[m]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex items-center justify-between rounded-control bg-surface-2 px-4 py-3">
              <span className="text-[13px] text-muted">Total</span>
              <span className="text-base font-semibold tabular-nums text-ink">
                {Number.isFinite(effectiveAmount) ? formatIDR(effectiveAmount) : "—"}
              </span>
            </div>
            <Button className="w-full" loading={submitting} onClick={submitTopUp}>
              Lanjutkan (simulasi)
            </Button>
            <DemoNote>
              Payment gateway belum dipilih pada fase ini — QRIS, VA, transfer bank, dan e-wallet
              adalah metode yang direncanakan.
            </DemoNote>
          </div>
        )}
      </Modal>
    </div>
  );
}
