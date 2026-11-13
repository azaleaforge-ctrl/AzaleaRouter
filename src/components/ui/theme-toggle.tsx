"use client";

import { useTheme } from "@/components/shared/hooks";

/** Light/dark toggle. Initial preference follows system; light is the fallback. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolved, setTheme } = useTheme();
  const dark = resolved === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      aria-pressed={dark}
      className={`inline-flex size-9 items-center justify-center rounded-control border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {dark ? (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="10" cy="10" r="4" />
          <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M16 4l-1.4 1.4M5.4 14.6 4 16M16 16l-1.4-1.4M5.4 5.4 4 4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
