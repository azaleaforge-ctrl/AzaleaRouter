import type { Page, PageQuery } from "@/lib/api-client/types";

export function paginate<T>(items: readonly T[], query: PageQuery = {}): Page<T> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize ?? 10)));
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  return {
    items: slice,
    page,
    pageSize,
    total: items.length,
    hasMore: start + slice.length < items.length,
  };
}

export function dateKey(value: string): string {
  return value.slice(0, 10);
}

export function withinRange(
  value: string,
  from?: string,
  to?: string,
): boolean {
  const key = dateKey(value);
  if (from && key < dateKey(from)) {
    return false;
  }
  if (to && key > dateKey(to)) {
    return false;
  }
  return true;
}
