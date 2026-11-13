"use client";

export interface StackSeries {
  id: string;
  label: string;
  color: string;
  /** One value per category, aligned by index. */
  values: number[];
}

/** Stacked bars per category (e.g. biaya per model per tanggal). */
export function StackedBarChart({
  categories,
  series,
  height = 220,
  formatValue = (v: number) => String(v),
}: {
  categories: string[];
  series: StackSeries[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const width = 640;
  const pad = { top: 12, right: 8, bottom: 26, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const totals = categories.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const max = Math.max(...totals, 1);
  const bandW = categories.length > 0 ? innerW / categories.length : innerW;
  const barW = Math.min(36, bandW * 0.6);
  const xLabelEvery = Math.max(1, Math.ceil(categories.length / 8));

  const summary = `Total tertinggi ${formatValue(Math.max(...totals, 0))}. Kategori: ${categories.length}.`;

  if (categories.length === 0 || series.length === 0) {
    return (
      <div role="img" aria-label="Grafik batang kosong: belum ada data." className="flex h-40 items-center justify-center text-sm text-muted">
        Belum ada data untuk periode ini
      </div>
    );
  }

  return (
    <svg
      role="img"
      aria-label={`Grafik batang bertumpuk. ${summary}`}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
    >
      {[0, 0.5, 1].map((f) => {
        const y = pad.top + innerH - f * innerH;
        return (
          <g key={f}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--line)" />
            <text x={pad.left - 8} y={y + 3.5} textAnchor="end" className="fill-muted" style={{ fontSize: 10 }}>
              {formatValue(max * f)}
            </text>
          </g>
        );
      })}
      {categories.map((cat, i) => {
        const x = pad.left + i * bandW + (bandW - barW) / 2;
        let yCursor = pad.top + innerH;
        return (
          <g key={cat}>
            {series.map((s) => {
              const v = s.values[i] ?? 0;
              if (v <= 0) return null;
              const h = (v / max) * innerH;
              yCursor -= h;
              return (
                <rect key={s.id} x={x} y={yCursor} width={barW} height={Math.max(h - 1, 1)} rx="2.5" fill={s.color}>
                  <title>{`${cat} — ${s.label}: ${formatValue(v)}`}</title>
                </rect>
              );
            })}
            {i % xLabelEvery === 0 ? (
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="fill-muted" style={{ fontSize: 10 }}>
                {cat}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal ranked bars — naturally accessible, used for "top models". */
export function BarList({
  items,
  formatValue = (v: number) => String(v),
  emptyLabel = "Belum ada data",
}: {
  items: Array<{ id: string; label: string; value: number; color?: string; hint?: string }>;
  formatValue?: (value: number) => string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-ink">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{formatValue(item.value)}</span>
          </div>
          <div
            role="meter"
            aria-valuenow={item.value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={`${item.label}: ${formatValue(item.value)}${item.hint ? `, ${item.hint}` : ""}`}
            className="h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%`, background: item.color ?? "var(--primary)" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
