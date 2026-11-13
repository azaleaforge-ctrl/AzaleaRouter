"use client";

export interface LegendItem {
  id: string;
  label: string;
  color: string;
  visible: boolean;
}

/**
 * Chart legend with optional per-series toggles. Color is never the only
 * identifier — every item carries its text label.
 */
export function ChartLegend({
  items,
  onToggle,
  className = "",
}: {
  items: LegendItem[];
  onToggle?: (id: string) => void;
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 ${className}`}>
      {items.map((item) => {
        const content = (
          <>
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: item.color, opacity: item.visible ? 1 : 0.3 }}
            />
            <span className={`truncate text-xs ${item.visible ? "text-ink" : "text-muted line-through"}`}>
              {item.label}
            </span>
          </>
        );
        return (
          <li key={item.id}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={item.visible}
                onClick={() => onToggle(item.id)}
                className="inline-flex max-w-56 items-center gap-2 rounded-control px-1.5 py-1 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {content}
              </button>
            ) : (
              <span className="inline-flex max-w-56 items-center gap-2 px-1.5 py-1">{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
