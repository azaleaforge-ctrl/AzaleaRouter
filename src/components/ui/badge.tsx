import type {
  ApiKeyStatus,
  BillingStatus,
  ModelStatus,
  ServiceStatus,
  TransactionStatus,
} from "@/lib/api-client";

export type BadgeTone = "neutral" | "primary" | "teal" | "warning" | "danger" | "outline";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted border-transparent",
  primary: "bg-primary-soft text-primary border-transparent",
  teal: "bg-teal-soft text-teal border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  outline: "bg-surface text-muted border-line",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className = "",
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/**
 * Status is never conveyed by color alone: each pill carries a dot + label,
 * and tones map to distinct text labels.
 */
export function StatusPill({
  label,
  tone,
  className = "",
}: {
  label: string;
  tone: BadgeTone;
  className?: string;
}) {
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}

/* ---- Domain status mappers (Indonesian labels, English technical terms kept) ---- */

export function modelStatusPill(status: ModelStatus) {
  const map: Record<ModelStatus, { label: string; tone: BadgeTone }> = {
    available: { label: "Tersedia", tone: "teal" },
    limited: { label: "Terbatas", tone: "warning" },
    deprecated: { label: "Deprecated", tone: "neutral" },
    unavailable: { label: "Tidak tersedia", tone: "danger" },
  };
  const meta = map[status];
  return <StatusPill label={meta.label} tone={meta.tone} />;
}

export function apiKeyStatusPill(status: ApiKeyStatus) {
  const map: Record<ApiKeyStatus, { label: string; tone: BadgeTone }> = {
    active: { label: "Aktif", tone: "teal" },
    revoked: { label: "Dicabut", tone: "danger" },
    expired: { label: "Kedaluwarsa", tone: "neutral" },
  };
  const meta = map[status];
  return <StatusPill label={meta.label} tone={meta.tone} />;
}

export function transactionStatusPill(status: TransactionStatus) {
  const map: Record<TransactionStatus, { label: string; tone: BadgeTone }> = {
    settled: { label: "Settled", tone: "teal" },
    pending: { label: "Pending", tone: "warning" },
    failed: { label: "Gagal", tone: "danger" },
    reversed: { label: "Reversed", tone: "neutral" },
    pending_reconciliation: { label: "Pending reconciliation", tone: "warning" },
  };
  const meta = map[status];
  return <StatusPill label={meta.label} tone={meta.tone} />;
}

export function billingStatusPill(status: BillingStatus) {
  const map: Record<BillingStatus, { label: string; tone: BadgeTone }> = {
    reserved: { label: "Reserved", tone: "warning" },
    settled: { label: "Settled", tone: "teal" },
    released: { label: "Released", tone: "neutral" },
    pending_reconciliation: { label: "Pending reconciliation", tone: "warning" },
    refunded: { label: "Refunded", tone: "neutral" },
    failed_no_charge: { label: "Failed / no charge", tone: "danger" },
  };
  const meta = map[status];
  return <StatusPill label={meta.label} tone={meta.tone} />;
}

export function serviceStatusPill(status: ServiceStatus) {
  const map: Record<ServiceStatus, { label: string; tone: BadgeTone }> = {
    operational: { label: "Operasional", tone: "teal" },
    degraded: { label: "Terganggu sebagian", tone: "warning" },
    "partial-outage": { label: "Outage sebagian", tone: "warning" },
    "major-outage": { label: "Outage besar", tone: "danger" },
    maintenance: { label: "Maintenance", tone: "primary" },
    unknown: { label: "Tidak diketahui", tone: "neutral" },
  };
  const meta = map[status];
  return <StatusPill label={meta.label} tone={meta.tone} />;
}
