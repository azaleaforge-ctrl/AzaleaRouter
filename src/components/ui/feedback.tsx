import type { ReactNode } from "react";

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Memuat"
      className={`inline-block animate-spin rounded-full border-2 border-primary border-t-transparent ${className}`}
    />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton-shimmer ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Stable-dimension table skeleton so loading never shifts layout. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div aria-hidden="true" className="space-y-2.5 px-1 py-1">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-9 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      {icon ? (
        <div aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-card bg-surface-2 text-muted">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-[13px] text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Gagal memuat data",
  description,
  onRetry,
  className = "",
}: {
  title?: string;
  description?: string | null;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-card border border-danger/30 bg-danger-soft/40 px-6 py-12 text-center ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mb-3 size-8 text-danger" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1.5 max-w-md text-[13px] text-muted">{description}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-control border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Coba lagi
        </button>
      ) : null}
    </div>
  );
}

/** Marks illustrative fixture data. Required wherever mock values render. */
export function DemoBadge({ label = "Data demo", className = "" }: { label?: string; className?: string }) {
  return (
    <span
      title="Nilai ini adalah data demo ilustratif, bukan data nyata."
      className={`inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M8 1.5 14 4.5v3.2c0 3.4-2.4 5.9-6 6.8-3.6-.9-6-3.4-6-6.8V4.5l6-3Z" strokeLinejoin="round" />
        <path d="M8 5.5v3m0 2h.01" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

/** Inline explanatory note for demo provenance / simulated actions. */
export function DemoNote({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-control border border-line bg-surface-2/70 px-3 py-2 text-xs leading-5 text-muted ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 7.5v3.5m0-6h.01" strokeLinecap="round" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

/** Live/reconnecting/offline indicator fed by ApiMeta or WalletSnapshot. */
export function ConnectionBanner({
  connection,
  stale,
  className = "",
}: {
  connection: "live" | "reconnecting" | "offline" | undefined;
  stale?: boolean;
  className?: string;
}) {
  if (!connection || connection === "live") {
    return stale ? (
      <p className={`flex items-center gap-2 rounded-control bg-warning-soft px-3 py-2 text-xs font-medium text-warning ${className}`}>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
        Data mungkin sudah usang (stale). Menampilkan snapshot terakhir yang tersedia.
      </p>
    ) : null;
  }
  const offline = connection === "offline";
  return (
    <p
      role="status"
      className={`flex items-center gap-2 rounded-control px-3 py-2 text-xs font-medium ${
        offline ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
      } ${className}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full bg-current ${offline ? "" : "animate-pulse"}`} />
      {offline
        ? "Koneksi terputus — menampilkan data demo terakhir yang tersimpan."
        : "Menyambungkan ulang ke stream demo… data akan diperbarui otomatis."}
    </p>
  );
}
