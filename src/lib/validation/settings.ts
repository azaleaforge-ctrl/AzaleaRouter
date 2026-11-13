import { validateName } from "./auth";
import { validatePassword } from "./auth";
import { validationResult, type ValidationErrors, type ValidationResult } from "./types";

export function validateProfileForm(input: {
  name: string;
  company?: string;
  timezone?: string;
}): ValidationResult {
  const errors: ValidationErrors = {};
  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;
  if (input.company !== undefined && input.company.length > 80) {
    errors.company = "Nama perusahaan maksimal 80 karakter.";
  }
  if (input.timezone !== undefined && !input.timezone.trim()) {
    errors.timezone = "Zona waktu wajib diisi.";
  }
  return validationResult(errors);
}

export function validatePasswordChangeForm(input: {
  currentPassword: string;
  newPassword: string;
}): ValidationResult {
  const errors: ValidationErrors = {};
  if (!input.currentPassword) {
    errors.currentPassword = "Password saat ini wajib diisi.";
  }
  const newPasswordError = validatePassword(input.newPassword);
  if (newPasswordError) errors.newPassword = newPasswordError;
  if (
    input.currentPassword &&
    input.newPassword &&
    input.currentPassword === input.newPassword
  ) {
    errors.newPassword = "Password baru harus berbeda dari password saat ini.";
  }
  return validationResult(errors);
}
