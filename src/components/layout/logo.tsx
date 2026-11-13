/**
 * AzaleaRouter mark: five-petal azalea blossom (per supplied brand reference).
 * Solid primary petals with a small teal center accent — restrained per PRD §4.2.
 * Petals are pure geometry (no defs) so CSS variables theme it in light/dark.
 */
export function Logo({
  size = 28,
  withWord = true,
  className = "",
}: {
  size?: number;
  withWord?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Five petals, 72° apart, rotated around the blossom center.
            rx/cy chosen so adjacent petals leave a hairline gap (chord ≈ 7.9 > 2·rx). */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse
            key={angle}
            cx="16"
            cy="9.3"
            rx="3.8"
            ry="6"
            fill="var(--primary)"
            transform={`rotate(${angle} 16 16)`}
          />
        ))}
        <circle cx="16" cy="16" r="1.7" fill="var(--teal-bright)" />
      </svg>
      {withWord ? (
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          Azalea<span className="text-primary">Router</span>
        </span>
      ) : null}
    </span>
  );
}
