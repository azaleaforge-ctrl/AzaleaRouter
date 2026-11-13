"use client";

import type { ReactNode } from "react";

/** Complex tables scroll safely on small screens (PRD §10.1). */
export function TableWrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`} tabIndex={0} role="region" aria-label="Tabel data, dapat digulir horizontal">
      {children}
    </div>
  );
}

export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <table className="w-full min-w-[640px] border-collapse text-sm">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      {children}
    </table>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line bg-surface-2/60 text-left">{children}</tr>
    </thead>
  );
}

export function TH({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted ${className}`}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-surface-2/50 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className = "",
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 align-middle text-ink ${className}`}>
      {children}
    </td>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className = "",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Navigasi halaman" className={`flex items-center justify-between gap-3 ${className}`}>
      <p className="text-xs text-muted" aria-live="polite">
        Menampilkan {from}–{to} dari {total} data
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          ← Sebelumnya
        </button>
        <span className="text-xs text-muted">
          Halaman {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          Berikutnya →
        </button>
      </div>
    </nav>
  );
}
