import { validationResult, type ValidationErrors, type ValidationResult } from "./types";

export const MIN_TOP_UP_IDR = 50_000;

export function validateTopUpAmount(amount: number): string | null {
  if (!Number.isFinite(amount)) {
    return "Nominal top-up harus berupa angka.";
  }
  if (!Number.isInteger(amount)) {
    return "Nominal top-up harus bilangan bulat.";
  }
  if (amount < MIN_TOP_UP_IDR) {
    return "Minimum top-up demo adalah Rp50.000.";
  }
  return null;
}

export function validateTopUpForm(input: {
  amount: number;
  method: string;
}): ValidationResult {
  const errors: ValidationErrors = {};
  const amountError = validateTopUpAmount(input.amount);
  if (amountError) errors.amount = amountError;
  if (!input.method) errors.method = "Pilih metode top-up demo.";
  return validationResult(errors);
}
