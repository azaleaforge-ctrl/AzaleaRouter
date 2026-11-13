const JAKARTA_TIME_ZONE = "Asia/Jakarta";

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: JAKARTA_TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: JAKARTA_TIME_ZONE,
});

export function formatDateTime(iso: string): string {
  return `${dateTimeFormatter.format(new Date(iso))} WIB`;
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  if (diffMs < 60_000) {
    return "baru saja";
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return `${minutes} menit lalu`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} jam lalu`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} hari lalu`;
  }

  return formatDate(iso);
}

export function formatDateRange(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`;
}
