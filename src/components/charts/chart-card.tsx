"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/**
 * Chart container that guarantees an accessible alternative: a collapsible
 * data table with the same numbers (PRD §6.9 / §10.2).
 */
export function ChartCard({
  title,
  description,
  actions,
  table,
  tableOpen = false,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Table rendering the same data as the chart (required for charts). */
  table: ReactNode;
  tableOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
          {description ? <p className="text-[13px] text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
      <details open={tableOpen} className="border-t border-line">
        <summary className="cursor-pointer select-none px-5 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          Lihat sebagai tabel (alternatif grafik)
        </summary>
        <div className="border-t border-line bg-surface-2/40 px-2 py-2">{table}</div>
      </details>
    </Card>
  );
}
