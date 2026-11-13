import type { ReactNode } from "react";

export function Card({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-line bg-surface shadow-soft ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 ${className}`}
    >
      <div className="min-w-0 space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
        {description ? <p className="text-[13px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "primary" | "teal" | "warning" | "danger";
  className?: string;
}) {
  const toneRing: Record<string, string> = {
    default: "",
    primary: "border-l-2 border-l-primary",
    teal: "border-l-2 border-l-teal-bright",
    warning: "border-l-2 border-l-warning",
    danger: "border-l-2 border-l-danger",
  };
  return (
    <Card className={`p-5 ${toneRing[tone]} ${className}`}>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
