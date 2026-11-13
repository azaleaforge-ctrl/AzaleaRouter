import type { ApiKeyCreateInput } from "@/lib/api-client/contracts/api-keys";
import { validationResult, type ValidationErrors, type ValidationResult } from "./types";

export function validateApiKeyLabel(label: string): string | null {
  const value = label.trim();
  if (!value) {
    return "Label API key wajib diisi.";
  }
  if (value.length > 50) {
    return "Label API key maksimal 50 karakter.";
  }
  return null;
}

export function validateApiKeyCreateForm(
  input: ApiKeyCreateInput,
): ValidationResult {
  const errors: ValidationErrors = {};
  const labelError = validateApiKeyLabel(input.label);
  if (labelError) errors.label = labelError;

  if (
    input.spendLimitIdr !== undefined &&
    input.spendLimitIdr !== null &&
    (!Number.isFinite(input.spendLimitIdr) || input.spendLimitIdr < 0)
  ) {
    errors.spendLimitIdr = "Batas belanja tidak boleh negatif.";
  }

  if (
    input.rateLimitPerMinute !== undefined &&
    input.rateLimitPerMinute !== null &&
    (!Number.isInteger(input.rateLimitPerMinute) || input.rateLimitPerMinute < 1)
  ) {
    errors.rateLimitPerMinute = "Rate limit minimal 1 permintaan per menit.";
  }

  return validationResult(errors);
}
