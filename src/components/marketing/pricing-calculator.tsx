"use client";

import { useMemo, useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent, StatCard } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { DemoBadge, DemoNote, TableSkeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { formatUsdPerMillion, formatDecimal, formatDateTime } from "@/lib/formatters";

export function PricingClient() {
  const state = useApiData(() => api.catalog.list({ pageSize: 50, sort: "input-price" }), []);
  const models = state.data?.page.items ?? [];

  const [modelId, setModelId] = useState<string>("");
  const [inputTokens, setInputTokens] = useState("1000000");
  const [outputTokens, setOutputTokens] = useState("250000");

  const selected = models.find((m) => m.id === modelId) ?? models[0] ?? null;

  const estimate = useMemo(() => {
    if (!selected) return null;
    const inTok = Number(inputTokens) || 0;
    const outTok = Number(outputTokens) || 0;
    const inPrice = selected.pricing.inputPerMillion;
    const outPrice = selected.pricing.outputPerMillion;
    if (inPrice === null && outPrice === null) return null;
    const usd = ((inPrice ?? 0) * inTok + (outPrice ?? 0) * outTok) / 1_000_000;
    return { usd, inTok, outTok };
  }, [selected, inputTokens, outputTokens]);

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        title="Harga & Kalkulator"
        description="Harga ditampilkan terpisah untuk input dan output, per 1 juta token, dalam USD dari snapshot katalog. Debit final selalu dihitung backend."
        actions={<DemoBadge label="Harga demo" />}
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Input vs output</h2>
          <p className="mt-1.5 text-[13px] leading-6 text-muted">
            Token yang kamu kirim (input) dan token yang dihasilkan model (output) dihitung dengan
            tarif berbeda, keduanya per 1 juta token.
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Cached input</h2>
          <p className="mt-1.5 text-[13px] leading-6 text-muted">
            Sebagian model memberi tarif lebih murah untuk input yang tersimpan cache — ditampilkan
            terpisah bila tersedia.
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Saldo prepaid</h2>
          <p className="mt-1.5 text-[13px] leading-6 text-muted">
            Rencana produk: isi saldo Rupiah lebih dulu (minimum Rp50.000), biaya dipotong dari
            pemakaian aktual. Di demo, top-up hanya disimulasikan.
          </p>
        </Card>
      </div>

      {/* Calculator */}
      <Card className="mb-10">
        <CardHeader
          title="Kalkulator estimasi"
          description="Hitung estimasi biaya untuk skenario pemakaianmu."
          actions={<DemoBadge label="Estimasi demo" />}
        />
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <Field label="Model">
                {({ id }) => (
                  <Select id={id} value={selected?.id ?? ""} onChange={(e) => setModelId(e.target.value)}>
                    {models.length === 0 ? <option value="">Memuat katalog…</option> : null}
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.developer.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Token input" hint="Contoh: 1000000 = 1 juta token">
                  {({ id }) => (
                    <Input id={id} type="number" min={0} value={inputTokens} onChange={(e) => setInputTokens(e.target.value)} />
                  )}
                </Field>
                <Field label="Token output">
                  {({ id }) => (
                    <Input id={id} type="number" min={0} value={outputTokens} onChange={(e) => setOutputTokens(e.target.value)} />
                  )}
                </Field>
              </div>
              {selected ? (
                <p className="text-xs text-muted">
                  Tarif {selected.name}: input {formatUsdPerMillion(selected.pricing.inputPerMillion)} ·
                  output {formatUsdPerMillion(selected.pricing.outputPerMillion)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col justify-center gap-3 rounded-card bg-surface-2/60 p-6">
              {estimate ? (
                <>
                  <StatCard
                    label="Estimasi biaya (USD)"
                    value={`$${estimate.usd.toFixed(4)}`}
                    hint={`${formatDecimal(estimate.inTok)} token input · ${formatDecimal(estimate.outTok)} token output`}
                    tone="primary"
                  />
                  <DemoNote>
                    Estimasi presentasi saja. Konversi ke IDR memerlukan kurs snapshot dari backend
                    yang belum tersedia di kontrak demo, dan debit final dihitung saat settlement —
                    tidak pernah di browser.
                  </DemoNote>
                </>
              ) : (
                <p className="text-sm text-muted">Pilih model untuk melihat estimasi.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price table */}
      <Card>
        <CardHeader title="Contoh tarif katalog (demo)" description="Diurutkan berdasarkan harga input." />
        {state.loading && state.data === null ? (
          <TableSkeleton rows={6} cols={5} />
        ) : state.error ? (
          <div className="p-5">
            <DemoNote>{state.error}</DemoNote>
          </div>
        ) : (
          <TableWrap>
            <Table caption="Contoh tarif per model dari katalog demo">
              <THead>
                <TH>Model</TH>
                <TH>Pengembang</TH>
                <TH>Input / 1M</TH>
                <TH>Output / 1M</TH>
                <TH>Cached / 1M</TH>
                <TH>Diperbarui</TH>
              </THead>
              <TBody>
                {models.map((m) => (
                  <TR key={m.id}>
                    <TD className="font-medium">{m.name}</TD>
                    <TD className="text-muted">{m.developer.name}</TD>
                    <TD className="tabular-nums">{formatUsdPerMillion(m.pricing.inputPerMillion)}</TD>
                    <TD className="tabular-nums">{formatUsdPerMillion(m.pricing.outputPerMillion)}</TD>
                    <TD className="tabular-nums">{formatUsdPerMillion(m.pricing.cachedInputPerMillion)}</TD>
                    <TD className="text-xs text-muted">{formatDateTime(m.pricing.updatedAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <DemoNote className="mt-8">
        Seluruh tarif berasal dari snapshot katalog demo dan dapat berubah — bukan harga jual
        nyata maupun penawaran.
      </DemoNote>
    </div>
  );
}
