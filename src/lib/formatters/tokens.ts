import { formatCompactNumber, formatDecimal } from "./currency";

export function formatTokenCount(value: number): string {
  if (value < 10_000) {
    return `${formatDecimal(value)} token`;
  }
  return `${formatCompactNumber(value)} token`;
}

export function formatTokenRate(value: number | null): string {
  if (value === null) {
    return "Tidak tersedia";
  }
  return `${formatCompactNumber(value)} token/detik`;
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}
