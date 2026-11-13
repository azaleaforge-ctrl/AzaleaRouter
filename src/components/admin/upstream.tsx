"use client";

import { useState } from "react";
import type { AdminProviderRow } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoBadge, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/formatters";

const STATUS_META: Record<AdminProviderRow["status"], { label: string; tone: BadgeTone }> = {
  operational: { label: "Operasional", tone: "teal" },
  degraded: { label: "Terganggu", tone: "warning" },
  unavailable: { label: "Tidak tersedia", tone: "danger" },
};

export function AdminUpstreamClient() {
  const { toast } = useToast();
  const state = useApiData(() => api.admin.listProviders(), []);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh(provider: AdminProviderRow) {
    setBusyId(provider.id);
    const res = await api.admin.refreshProvider({ providerId: provider.id });
    setBusyId(null);
    if (res.ok) {
      state.reload();
      toast({ title: "Refresh disimulasikan", description: res.data.message, tone: "primary" });
    } else {
      toast({ title: "Gagal refresh", description: res.error.message, tone: "danger" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Upstream"
        description="Kesehatan provider upstream yang melayani katalog demo. Arsitektur wajib memakai adapter agar provider dapat diganti."
        actions={<DemoBadge label="Simulasi" />}
      />

      {state.loading && state.data === null ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : (
        <ul className="space-y-3">
          {(state.data ?? []).map((p) => (
            <li key={p.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{p.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {p.models} model · dicek {formatRelativeTime(p.lastCheckedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill label={STATUS_META[p.status].label} tone={STATUS_META[p.status].tone} />
                  <Button variant="secondary" size="sm" loading={busyId === p.id} onClick={() => refresh(p)}>
                    Refresh (simulasi)
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card className="mt-6">
        <CardContent className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Catatan arsitektur upstream</h2>
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-6 text-muted">
            <li>
              Gateway menerima API key pelanggan berawalan <span className="font-mono">AZL-</span>;
              kredensial upstream tidak pernah diberikan kepada pelanggan.
            </li>
            <li>
              Izin penggunaan upstream untuk resale akses API wajib dikonfirmasi tertulis sebelum
              transaksi pelanggan diaktifkan — belum ada klaim izin pada demo ini.
            </li>
            <li>
              Upstream balance/credit memerlukan endpoint khusus dari upstream — belum tersedia di
              kontrak demo (gap tercatat).
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
