import { z } from "zod";

const decimalPattern = /^\d+(?:\.\d{1,24})?$/;
const MAX_DIGITS = 38;
const SCALE_DIGITS = 24;
const SCALE = 10n ** BigInt(SCALE_DIGITS);

export const idrAmountSchema = z.string()
  .regex(/^(?:0|[1-9]\d{0,37})$/, "IDR amount must be a non-negative integer string.");

export type IdRAmount = string & { readonly __brand: "IdRAmount" };

export function parseIdrAmount(value: string): bigint {
  if (!/^(?:0|[1-9]\d{0,37})$/.test(value)) {
    throw new RangeError("IDR amount must be a non-negative integer string of at most 38 digits.");
  }
  return BigInt(value);
}

export function toIdrAmount(value: bigint): IdRAmount {
  if (value < 0n || value.toString().length > MAX_DIGITS) {
    throw new RangeError("IDR amount is outside the supported range.");
  }
  return value.toString() as IdRAmount;
}

export function addIdr(left: string, right: string): IdRAmount {
  return toIdrAmount(parseIdrAmount(left) + parseIdrAmount(right));
}

export function subtractIdr(left: string, right: string): IdRAmount {
  const result = parseIdrAmount(left) - parseIdrAmount(right);
  if (result < 0n) throw new RangeError("IDR balance cannot become negative.");
  return toIdrAmount(result);
}

export function compareIdr(left: string, right: string): -1 | 0 | 1 {
  const a = parseIdrAmount(left);
  const b = parseIdrAmount(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function parseScaledDecimal(value: string): bigint {
  if (!decimalPattern.test(value) || value.length > 64) {
    throw new RangeError("Decimal value must be a non-negative decimal string with at most 24 fractional places.");
  }
  const [whole = "", fraction = ""] = value.split(".");
  if (whole.length > 14) throw new RangeError("Decimal whole part exceeds supported precision.");
  return BigInt(whole) * SCALE + BigInt((fraction + "0".repeat(SCALE_DIGITS)).slice(0, SCALE_DIGITS));
}

function ceilDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError("Denominator must be positive.");
  if (numerator < 0n) throw new RangeError("Numerator cannot be negative.");
  return numerator === 0n ? 0n : (numerator + denominator - 1n) / denominator;
}

export interface UsageCostInput {
  promptPriceUsdPerToken: string;
  completionPriceUsdPerToken: string;
  requestPriceUsd?: string;
  imagePriceUsd?: string;
  promptTokens: number;
  completionTokens: number;
  requestCount?: number;
  imageCount?: number;
  usdToIdrRate: string;
  markupBasisPoints: number;
  fixedFeeIdr?: string;
}

export interface UsageCostResult {
  providerCostIdr: IdRAmount;
  customerChargeIdr: IdRAmount;
  fxRate: string;
  markupBasisPoints: number;
}

/**
 * Calculates source cost and customer charge using integer/BigInt fixed-point math.
 * The upstream price snapshot and FX rate must be passed explicitly; this function
 * never fetches, guesses, converts through Number, or mutates historical prices.
 * Rounding is upward to the next whole rupiah so a positive sub-rupiah cost is not
 * accidentally treated as a zero-cost request.
 */
export function calculateUsageCostIdr(input: UsageCostInput): UsageCostResult {
  const counts = [
    input.promptTokens,
    input.completionTokens,
    input.requestCount ?? 0,
    input.imageCount ?? 0,
  ];
  if (counts.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new RangeError("Usage counters must be safe non-negative integers.");
  }
  if (!Number.isInteger(input.markupBasisPoints) || input.markupBasisPoints < 0 || input.markupBasisPoints > 100_000) {
    throw new RangeError("Markup must be an integer between 0 and 100000 basis points.");
  }

  const promptCost = parseScaledDecimal(input.promptPriceUsdPerToken) * BigInt(input.promptTokens);
  const completionCost = parseScaledDecimal(input.completionPriceUsdPerToken) * BigInt(input.completionTokens);
  const requestCost = parseScaledDecimal(input.requestPriceUsd ?? "0") * BigInt(input.requestCount ?? 0);
  const imageCost = parseScaledDecimal(input.imagePriceUsd ?? "0") * BigInt(input.imageCount ?? 0);
  const providerCostUsdScaled = promptCost + completionCost + requestCost + imageCost;
  const fxScaled = parseScaledDecimal(input.usdToIdrRate);
  if (fxScaled <= 0n) throw new RangeError("USD/IDR rate must be greater than zero.");

  const providerCostIdrScaled = ceilDivide(providerCostUsdScaled * fxScaled, SCALE);
  const providerCostIdr = ceilDivide(providerCostIdrScaled, SCALE);
  const markupMultiplier = 10_000n + BigInt(input.markupBasisPoints);
  const markedIdrScaled = ceilDivide(providerCostIdrScaled * markupMultiplier, 10_000n);
  const fixedFee = parseIdrAmount(input.fixedFeeIdr ?? "0");
  const customerCharge = ceilDivide(markedIdrScaled, SCALE) + fixedFee;

  return {
    providerCostIdr: toIdrAmount(providerCostIdr),
    customerChargeIdr: toIdrAmount(customerCharge),
    fxRate: input.usdToIdrRate,
    markupBasisPoints: input.markupBasisPoints,
  };
}
