"use client";

import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { formatDate } from "@/lib/formatters";

const CHANGE_META: Record<string, { label: string; tone: BadgeTone }> = {
  added: { label: "Baru", tone: "teal" },
  fixed: { label: "Perbaikan", tone: "primary" },
  changed: { label: "Perubahan", tone: "warning" },
  security: { label: "Keamanan", tone: "danger" },
};

export function ChangelogClient() {
  const state = useApiData(() => api.content.listChangelog(), []);

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <PageHeader
        title="Changelog"
        description="Versi, fitur baru, perbaikan, dan perubahan yang berdampak pada API atau billing."
        actions={<DemoBadge label="Konten demo" />}
      />

      {state.loading && state.data === null ? (
        <div className="space-y-4" aria-busy="true" aria-label="Memuat changelog">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
          ))}
        </div>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : (
        <ol className="relative space-y-6 border-l border-line pl-6">
          {(state.data ?? []).map((entry) => (
            <li key={entry.version} className="relative">
              <span aria-hidden="true" className="absolute -left-[31px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="primary">{entry.version}</Badge>
                  <h2 className="text-[15px] font-semibold text-ink">{entry.title}</h2>
                  <span className="text-xs text-muted">{formatDate(entry.date)}</span>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {entry.changes.map((change, i) => {
                    const meta = CHANGE_META[change.type] ?? { label: change.type, tone: "neutral" as BadgeTone };
                    return (
                      <li key={i} className="flex items-start gap-3 text-[13px] leading-6">
                        <Badge tone={meta.tone} className="mt-0.5 shrink-0">
                          {meta.label}
                        </Badge>
                        <span className="text-muted">{change.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <DemoNote className="mt-10">
        Entri changelog adalah konten demo — bukan catatan rilis produk nyata.
      </DemoNote>
    </div>
  );
}
