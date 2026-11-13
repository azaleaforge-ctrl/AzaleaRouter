"use client";

import { useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { TableWrap, Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatUsdPerMillion, formatDateTime } from "@/lib/formatters";

export function AdminPricingClient() {
  const { toast } = useToast();
  const catalog = useApiData(() => api.catalog.list({ pageSize: 50, sort: "name" }), []);

  // Local-only policy simulation — no admin pricing contract exists yet (flagged gap).
  const [markup, setMarkup] = useState("15");
  const [fx, setFx] = useState("16200");
  const [effectiveDate, setEffectiveDate] = useState("");

  return (
    <div>
      <PageHeader
        title="Pricing"
        description="Snapshot harga jual per model dari katalog demo, plus panel kebijakan harga sebagai simulasi tampilan."
        actions={<DemoBadge label="Simulasi" />}
      />

      <Card className="mb-6">
        <CardHeader
          title="Kebijakan harga (simulasi tampilan)"
          description="Markup, kurs snapshot, dan effective date pada produk final dikelola backend dengan audit log."
        />
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Markup default (%)">
              {({ id }) => <Input id={id} type="number" min={0} step={0.5} value={markup} onChange={(e) => setMarkup(e.target.value)} />}
            </Field>
            <Field label="Kurs USD→IDR (snapshot)">
              {({ id }) => <Input id={id} type="number" min={0} value={fx} onChange={(e) => setFx(e.target.value)} />}
            </Field>
            <Field label="Effective date">
              {({ id }) => <Input id={id} type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />}
            </Field>
          </div>
          <Button
            className="mt-4"
            onClick={() =>
              toast({
                title: "Disimpan secara lokal (simulasi)",
                description: "Kebijakan harga final ditentukan backend — panel ini hanya simulasi tampilan.",
                tone: "primary",
              })
            }
          >
            Simpan (simulasi)
          </Button>
          <DemoNote className="mt-4">
            Gap tercatat: modul pricing policy admin belum tersedia di kontrak demo. Harga model
            di bawah berasal dari snapshot katalog demo.
          </DemoNote>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Harga per model (snapshot demo)" description="Harga input/output/cached per 1 juta token." />
        {catalog.loading && catalog.data === null ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : catalog.error ? (
          <CardContent>
            <ErrorState description={catalog.error} onRetry={catalog.reload} />
          </CardContent>
        ) : (
          <TableWrap>
            <Table caption="Snapshot harga katalog (demo)">
              <THead>
                <TH>Model</TH>
                <TH>Pengembang</TH>
                <TH className="text-right">Input / 1M</TH>
                <TH className="text-right">Output / 1M</TH>
                <TH className="text-right">Cached / 1M</TH>
                <TH>Diperbarui</TH>
                <TH>Snapshot</TH>
              </THead>
              <TBody>
                {(catalog.data?.page.items ?? []).map((m) => (
                  <TR key={m.id}>
                    <TD className="font-medium">{m.name}</TD>
                    <TD className="text-muted">{m.developer.name}</TD>
                    <TD className="text-right tabular-nums">{formatUsdPerMillion(m.pricing.inputPerMillion)}</TD>
                    <TD className="text-right tabular-nums">{formatUsdPerMillion(m.pricing.outputPerMillion)}</TD>
                    <TD className="text-right tabular-nums">{formatUsdPerMillion(m.pricing.cachedInputPerMillion)}</TD>
                    <TD className="text-xs text-muted">{formatDateTime(m.pricing.updatedAt)}</TD>
                    <TD className="font-mono text-xs text-muted">{m.pricing.snapshotId}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <DemoNote className="mt-6">
        Admin tidak menentukan harga jual secara lokal pada produk final — harga berasal dari
        snapshot bertimestamp dengan kebijakan markup backend.
      </DemoNote>
    </div>
  );
}
