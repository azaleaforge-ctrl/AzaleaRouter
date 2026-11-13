"use client";

export interface DonutDatum {
  id: string;
  label: string;
  value: number;
  color: string;
}

/** SVG donut with per-segment tooltips and a text summary for screen readers. */
export function DonutChart({
  data,
  size = 190,
  thickness = 24,
  centerLabel,
  centerValue,
  formatValue = (v: number) => String(v),
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total <= 0) {
    return (
      <div
        role="img"
        aria-label="Grafik donut kosong: belum ada data untuk periode ini."
        className="flex items-center justify-center text-sm text-muted"
        style={{ width: size, height: size }}
      >
        Belum ada data
      </div>
    );
  }

  const summary = data
    .filter((d) => d.value > 0)
    .map((d) => `${d.label}: ${formatValue(d.value)}`)
    .join(", ");

  // Precompute segment rotations (pure — no outer mutation).
  const starts = data.map((_, i) => data.slice(0, i).reduce((sum, d) => sum + d.value, 0));
  const segments = data.map((datum, i) => ({ datum, start: starts[i] ?? 0 }));

  return (
    <svg
      role="img"
      aria-label={`Grafik donut proporsi per kategori. Total ${centerValue ?? formatValue(total)}. Rincian: ${summary}.`}
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size }}
    >
      {segments.map(({ datum: d, start }) => {
        if (d.value <= 0) return null;
        const fraction = d.value / total;
        const dash = fraction * circumference;
        const gap = circumference - dash;
        const rotation = -90 + (start / total) * 360;
        return (
          <circle
            key={d.id}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash - 1.5} ${gap + 1.5}`}
            strokeLinecap="butt"
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          >
            <title>{`${d.label}: ${formatValue(d.value)} (${Math.round(fraction * 100)}%)`}</title>
          </circle>
        );
      })}
      {centerValue ? (
        <>
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            className="fill-ink"
            style={{ fontSize: 15, fontWeight: 600 }}
          >
            {centerValue}
          </text>
          {centerLabel ? (
            <text x="50%" y="59%" textAnchor="middle" className="fill-muted" style={{ fontSize: 10.5 }}>
              {centerLabel}
            </text>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}
