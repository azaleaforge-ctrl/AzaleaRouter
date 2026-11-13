"use client";

import { useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
}

/** Roving-tabindex tab list with arrow-key navigation (WCAG pattern). */
export function Tabs({
  tabs,
  active,
  onChange,
  ariaLabel,
  className = "",
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + tabs.length) % tabs.length;
    const nextTab = tabs[next];
    if (!nextTab) return;
    onChange(nextTab.id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex flex-wrap gap-1 rounded-control bg-surface-2 p-1 ${className}`}>
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`rounded-[9px] px-3.5 py-1.5 text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
