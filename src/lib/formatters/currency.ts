const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

export function formatIDR(amount: number): string {
  return idrFormatter.format(amount);
}

export function formatSignedIDR(amount: number): string {
  return amount > 0 ? `+${formatIDR(amount)}` : formatIDR(amount);
}

export function formatUsdPerMillion(value: number | null): string {
  if (value === null) {
    return "Tidak tersedia";
  }
  return `${usdFormatter.format(value)} / 1M token`;
}

export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value);
}

export function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}%`;
}
