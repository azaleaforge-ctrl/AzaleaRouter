"use client";

import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, serviceStatusPill } from "@/components/ui/badge";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { formatDateTime, formatRelativeTime } from "@/lib/formatters";
import type { ServiceStatus } from "@/lib/api-client";

const OVERALL_LABELS: Record<ServiceStatus, string> = {
  operational: "Semua sistem beroperasi normal",
  degraded: "Sebagian layanan terganggu",
  "partial-outage": "Outage sebagian",
  "major-outage": "Outage besar",
  maintenance: "Maintenance terjadwal",
  unknown: "Status tidak diketahui",
};

const INCIDENT_STATUS: Record<string, { label: string; tone: "warning" | "primary" | "teal" | "danger" }> = {
  investigating: { label: "Investigasi", tone: "danger" },
  identified: { label: "Teridentifikasi", tone: "warning" },
  monitoring: { label: "Monitoring", tone: "primary" },
  resolved: { label: "Selesai", tone: "teal" },
};

export function StatusClient() {
  const state = useApiData(() => api.content.getStatus(), []);

  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <PageHeader
        title="Status Layanan"
        description="Kondisi komponen layanan dan riwayat insiden."
        actions={<DemoBadge label="Status demo" />}
      />

      {state.loading && state.data === null ? (
        <div className="space-y-4" aria-busy="true" aria-label="Memuat status">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <div className="space-y-8">
          <Card
            className={`p-6 ${
              state.data.overall === "operational"
                ? "border-teal/40 bg-teal-soft/40"
                : state.data.overall === "unknown"
                  ? ""
                  : "border-warning/40 bg-warning-soft/40"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              {serviceStatusPill(state.data.overall)}
              <p className="text-lg font-semibold tracking-tight text-ink">
                {OVERALL_LABELS[state.data.overall]}
              </p>
            </div>
            <p className="mt-2 text-xs text-muted">
              Diperbarui {formatDateTime(state.data.updatedAt)} ({formatRelativeTime(state.data.updatedAt)})
            </p>
          </Card>

          <section aria-labelledby="komponen">
            <h2 id="komponen" className="mb-4 text-lg font-semibold tracking-tight text-ink">
              Komponen layanan
            </h2>
            <ul className="space-y-2.5">
              {state.data.components.map((c) => (
                <li key={c.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{c.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">{formatRelativeTime(c.updatedAt)}</span>
                      {serviceStatusPill(c.status)}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="insiden">
            <h2 id="insiden" className="mb-4 text-lg font-semibold tracking-tight text-ink">
              Riwayat insiden
            </h2>
            {state.data.incidents.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted">
                Tidak ada insiden yang tercatat pada demo ini.
              </Card>
            ) : (
              <ol className="space-y-3">
                {state.data.incidents.map((inc) => {
                  const badge = INCIDENT_STATUS[inc.status];
                  return (
                    <li key={inc.id}>
                      <Card className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">{inc.title}</p>
                          <Badge tone={badge?.tone ?? "neutral"} dot>
                            {badge?.label ?? inc.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-[13px] leading-6 text-muted">{inc.summary}</p>
                        <p className="mt-2 text-xs text-muted">
                          Mulai {formatDateTime(inc.startedAt)}
                          {inc.resolvedAt ? ` · Selesai ${formatDateTime(inc.resolvedAt)}` : " · masih berlangsung (demo)"}
                        </p>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <DemoNote>
            Halaman status ini berisi data simulasi. Tidak ada klaim uptime, SLA, atau insiden
            nyata — status produksi memerlukan backend monitoring.
          </DemoNote>
        </div>
      ) : null}
    </div>
  );
}
