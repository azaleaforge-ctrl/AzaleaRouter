"use client";

import type { ReactNode } from "react";
import { ErrorState, EmptyState, Skeleton } from "@/components/ui/feedback";

export interface DataStateProps<T> {
  /** Result of `useApiData` (or a compatible slice). */
  loading: boolean;
  error: string | null;
  data: T | null;
  /** Rendered while loading. Keep dimensions stable to avoid layout shift. */
  skeleton: ReactNode;
  /** When true, shows the empty state instead of content. */
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  errorTitle?: string;
  children: (data: T) => ReactNode;
}

/**
 * Standard loading / error / empty / success renderer.
 * Every data-driven screen should wrap its content in this.
 */
export function DataState<T>({
  loading,
  error,
  data,
  skeleton,
  isEmpty,
  emptyTitle = "Belum ada data",
  emptyDescription = "Data akan muncul di sini setelah tersedia.",
  emptyAction,
  onRetry,
  errorTitle = "Gagal memuat data",
  children,
}: DataStateProps<T>) {
  if (loading && data === null) return <>{skeleton}</>;
  if (error) return <ErrorState title={errorTitle} description={error} onRetry={onRetry} />;
  if (data === null) return <ErrorState title={errorTitle} description="Data tidak tersedia." onRetry={onRetry} />;
  if (isEmpty?.(data)) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }
  return <>{children(data)}</>;
}

/** Generic page skeleton: header bar + content blocks. */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
