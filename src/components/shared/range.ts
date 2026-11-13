/** Shared usage/transaction period presets (PRD §6.9 filter waktu). */
export type UsageRange = "today" | "yesterday" | "7d" | "30d" | "this-month" | "prev-month";

export const USAGE_RANGES: Array<{ id: UsageRange; label: string }> = [
  { id: "today", label: "Hari ini" },
  { id: "yesterday", label: "Kemarin" },
  { id: "7d", label: "7 hari terakhir" },
  { id: "30d", label: "30 hari terakhir" },
  { id: "this-month", label: "Bulan ini" },
  { id: "prev-month", label: "Bulan sebelumnya" },
];

function iso(date: Date): string {
  return date.toISOString();
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Converts a preset to an inclusive from/to query.
 * honey: uses browser-local days as an Asia/Jakarta (WIB) approximation;
 * real timezone handling must come from the backend contract.
 */
export function rangeToDateQuery(range: UsageRange): { from: string; to: string } {
  const now = new Date();
  switch (range) {
    case "today":
      return { from: iso(startOfDay(now)), to: iso(endOfDay(now)) };
    case "yesterday": {
      const y = addDays(now, -1);
      return { from: iso(startOfDay(y)), to: iso(endOfDay(y)) };
    }
    case "7d":
      return { from: iso(startOfDay(addDays(now, -6))), to: iso(endOfDay(now)) };
    case "30d":
      return { from: iso(startOfDay(addDays(now, -29))), to: iso(endOfDay(now)) };
    case "this-month":
      return { from: iso(startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))), to: iso(endOfDay(now)) };
    case "prev-month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(startOfDay(first)), to: iso(endOfDay(last)) };
    }
  }
}

/** Short day labels for chart axes. */
export function shortDayLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
