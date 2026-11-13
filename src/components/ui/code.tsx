"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Salin",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* clipboard blocked — ignore, demo only */
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className={`inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {copied ? (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 text-teal" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 8.5 3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
        </svg>
      )}
      <span aria-live="polite">{copied ? "Tersalin!" : label}</span>
    </button>
  );
}

export function CodeBlock({
  code,
  filename,
  language,
  className = "",
}: {
  code: string;
  filename?: string;
  language?: string;
  className?: string;
}) {
  return (
    <figure className={`overflow-hidden rounded-card border border-line bg-surface-2 ${className}`}>
      <figcaption className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <span className="truncate font-mono text-xs text-muted">{filename ?? language ?? "kode"}</span>
        <CopyButton text={code} />
      </figcaption>
      <pre
        tabIndex={0}
        className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-ink"
      >
        <code>{code}</code>
      </pre>
    </figure>
  );
}
