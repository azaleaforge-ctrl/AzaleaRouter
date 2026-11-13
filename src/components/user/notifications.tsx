"use client";

import { useState } from "react";
import type { NotificationItem } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoBadge, DemoNote, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/formatters";

const KIND_META: Record<NotificationItem["kind"], { label: string; tone: BadgeTone }> = {
  billing: { label: "Billing", tone: "primary" },
  usage: { label: "Usage", tone: "teal" },
  security: { label: "Keamanan", tone: "warning" },
  product: { label: "Produk", tone: "neutral" },
};

export function NotificationsClient() {
  const { toast } = useToast();
  const state = useApiData(() => api.settings.listNotifications(), []);
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = state.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  async function markRead(id: string) {
    setBusyId(id);
    const res = await api.settings.markNotificationRead(id);
    setBusyId(null);
    if (res.ok) state.reload();
  }

  async function markAll() {
    for (const n of items.filter((x) => !x.read)) {
      await api.settings.markNotificationRead(n.id);
    }
    state.reload();
    toast({ title: "Semua notifikasi ditandai dibaca (demo)", tone: "primary" });
  }

  return (
    <div>
      <PageHeader
        title="Notifikasi"
        description="Pemberitahuan billing, usage, keamanan, dan produk."
        actions={
          <>
            <DemoBadge label="Data demo" />
            <Button variant="secondary" size="sm" onClick={markAll} disabled={unread === 0}>
              Tandai semua dibaca {unread > 0 ? `(${unread})` : ""}
            </Button>
          </>
        }
      />

      <Card>
        {state.loading && state.data === null ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : state.error ? (
          <CardContent>
            <ErrorState description={state.error} onRetry={state.reload} />
          </CardContent>
        ) : items.length === 0 ? (
          <EmptyState title="Tidak ada notifikasi" description="Notifikasi demo akan muncul di sini." />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => {
              const meta = KIND_META[n.kind];
              return (
                <li key={n.id} className={`flex items-start gap-3 px-5 py-4 ${n.read ? "" : "bg-primary-soft/30"}`}>
                  <span
                    aria-label={n.read ? "Sudah dibaca" : "Belum dibaca"}
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-line-strong" : "bg-primary"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <p className="text-[13.5px] font-semibold text-ink">{n.title}</p>
                    </div>
                    <p className="mt-1 text-[13px] leading-6 text-muted">{n.body}</p>
                    <p className="mt-1 text-xs text-muted">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {!n.read ? (
                    <Button variant="ghost" size="sm" loading={busyId === n.id} onClick={() => markRead(n.id)}>
                      Tandai dibaca
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <DemoNote className="mt-6">Notifikasi demo tidak dikirim dari server — status dibaca tersimpan lokal.</DemoNote>
    </div>
  );
}
