"use client";

import { useMemo, useState } from "react";

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  points: Array<{ label: string; value: number }>;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / magnitude) * magnitude;
}

/**
 * Multi-series time series chart. Hover with pointer, or focus it and use
 * arrow keys — a tooltip lists every series at the active point, and a text
 * summary is exposed to assistive technology.
 */
export function LineChart({
  series,
  height = 240,
  formatValue = (v: number) => String(v),
  ariaLabel = "Grafik time series",
}: {
  series: LineSeries[];
  height?: number;
  formatValue?: (value: number) => string;
  ariaLabel?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const width = 640;
  const pad = { top: 14, right: 12, bottom: 26, left: 52 };

  const pointCount = series[0]?.points.length ?? 0;
  const firstSeries = series[0];
  const maxValue = useMemo(() => {
    let max = 0;
    for (const s of series) for (const p of s.points) max = Math.max(max, p.value);
    return niceMax(max);
  }, [series]);

  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const xAt = (i: number) =>
    pad.left + (pointCount <= 1 ? innerW / 2 : (i / (pointCount - 1)) * innerW);
  const yAt = (v: number) => pad.top + innerH - (v / maxValue) * innerH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ value: maxValue * f, y: yAt(maxValue * f) }));
  const xLabelEvery = Math.max(1, Math.ceil(pointCount / 7));

  const summary =
    series.length > 0 && pointCount > 0
      ? `Titik pertama: ${series
          .map((s) => `${s.label} ${formatValue(s.points[0]?.value ?? 0)}`)
          .join(", ")}. Titik terakhir: ${series
          .map((s) => `${s.label} ${formatValue(s.points[pointCount - 1]?.value ?? 0)}`)
          .join(", ")}.`
      : "Belum ada data.";

  if (pointCount === 0 || !firstSeries) {
    return (
      <div role="img" aria-label={`${ariaLabel}. Belum ada data.`} className="flex h-40 items-center justify-center text-sm text-muted">
        Belum ada data untuk periode ini
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        role="img"
        aria-label={`${ariaLabel}. ${summary}`}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min(pointCount - 1, (a ?? -1) + 1));
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? pointCount) - 1));
          if (e.key === "Escape") setActive(null);
        }}
        onBlur={() => setActive(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * width;
          const i = Math.round(((x - pad.left) / innerW) * (pointCount - 1));
          setActive(Math.max(0, Math.min(pointCount - 1, i)));
        }}
        onMouseLeave={() => setActive(null)}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left} x2={width - pad.right} y1={t.y} y2={t.y} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.left - 8} y={t.y + 3.5} textAnchor="end" className="fill-muted" style={{ fontSize: 10 }}>
              {formatValue(t.value)}
            </text>
          </g>
        ))}

        {series.map((s) => {
          const line = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(p.value)}`).join(" ");
          const area = `${line} L${xAt(pointCount - 1)},${pad.top + innerH} L${xAt(0)},${pad.top + innerH} Z`;
          return (
            <g key={s.id}>
              <path d={area} fill={s.color} opacity="0.08" />
              <path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}

        {firstSeries.points.map((p, i) =>
          i % xLabelEvery === 0 || i === pointCount - 1 ? (
            <text key={i} x={xAt(i)} y={height - 8} textAnchor="middle" className="fill-muted" style={{ fontSize: 10 }}>
              {p.label}
            </text>
          ) : null,
        )}

        {active !== null ? (
          <g>
            <line
              x1={xAt(active)}
              x2={xAt(active)}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="var(--line-strong)"
              strokeDasharray="3 3"
            />
            {series.map((s) => (
              <circle
                key={s.id}
                cx={xAt(active)}
                cy={yAt(s.points[active]?.value ?? 0)}
                r="4"
                fill={s.color}
                stroke="var(--surface)"
                strokeWidth="2"
              />
            ))}
          </g>
        ) : null}
      </svg>

      {active !== null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-control border border-line bg-surface px-3 py-2 shadow-pop"
          style={{ left: `${(xAt(active) / width) * 100}%`, transform: "translateX(-50%)" }}
        >
          <p className="text-[11px] font-medium text-muted">{firstSeries.points[active]?.label}</p>
          <ul className="mt-1 space-y-0.5">
            {series.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-xs text-ink">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: s.color }} />
                <span className="text-muted">{s.label}</span>
                <span className="ml-auto font-medium tabular-nums">
                  {formatValue(s.points[active]?.value ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-1 text-center text-[11px] text-muted sm:hidden">
        Sentuh grafik untuk melihat nilai per titik.
      </p>
    </div>
  );
}
