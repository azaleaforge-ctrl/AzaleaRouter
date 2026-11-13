/**
 * Developer identity chip. Real logos are a pending brand-asset dependency,
 * so the catalog contract provides initials — rendered on a neutral tile
 * (PRD §4.5: neutral fallback, never a recolored or fake third-party logo).
 */
export function DeveloperLogo({
  initials,
  name,
  size = 40,
  className = "",
}: {
  initials: string;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Pengembang: ${name}`}
      title={name}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.32) }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full border border-line bg-surface-2 font-semibold uppercase tracking-wide text-muted ${className}`}
    >
      {initials || name.slice(0, 2)}
    </span>
  );
}
