"use client";

import { useState } from "react";
import type { AdminProviderRow } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusPill, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/formatters";

const STATUS_META: Record<AdminProviderRow["status"], { label: string; tone: BadgeTone }> = {
  operational: { label: "Operasional", tone: "teal" },
  degraded: { label: "Terganggu", tone: "warning" },
  unavailable: { label: "Tidak tersedia", tone: "danger" },
};

export function AdminProvidersClient() {
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
        title="Providers"
        description="Status endpoint provider yang melayani katalog demo. Daftar ini berasal dari kontrak, bukan daftar yang dikarang."
        actions={<DemoBadge label="Simulasi" />}
      />

      {state.loading && state.data === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(state.data ?? []).map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-semibold text-ink">{p.name}</h2>
                  <StatusPill label={STATUS_META[p.status].label} tone={STATUS_META[p.status].tone} />
                </div>
                <p className="mt-2 text-[13px] text-muted">{p.models} model terdaftar (demo)</p>
                <p className="mt-1 text-xs text-muted">Dicek {formatRelativeTime(p.lastCheckedAt)}</p>
                <div className="mt-auto pt-4">
                  <Button variant="secondary" size="sm" loading={busyId === p.id} onClick={() => refresh(p)}>
                    Refresh status (simulasi)
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <DemoNote className="mt-6">
        Endpoint list nyata di-cache dengan TTL dan timestamp; admin dapat memaksa refresh. Cache
        tidak boleh menyembunyikan model yang diketahui dinonaktifkan — aturan ini dijelaskan di
        PRD dan belum diimplementasikan pada demo.
      </DemoNote>
    </div>
  );
}
