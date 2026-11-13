import type { LoginInput, PasswordResetInput, RegisterInput } from "@/lib/api-client/contracts/auth";
import { validationResult, type ValidationErrors, type ValidationResult } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) {
    return "Email wajib diisi.";
  }
  if (!EMAIL_PATTERN.test(value)) {
    return "Format email belum valid.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password wajib diisi.";
  }
  if (password.length < 8) {
    return "Password minimal 8 karakter.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password harus memuat huruf dan angka.";
  }
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) {
    return "Nama wajib diisi.";
  }
  if (name.trim().length < 2) {
    return "Nama minimal 2 karakter.";
  }
  return null;
}

export function validateLoginForm(input: LoginInput): ValidationResult {
  const errors: ValidationErrors = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = "Password wajib diisi.";
  return validationResult(errors);
}

export function validateRegisterForm(input: RegisterInput): ValidationResult {
  const errors: ValidationErrors = {};
  const nameError = validateName(input.name);
  if (nameError) errors.name = nameError;
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (!input.acceptTerms) {
    errors.acceptTerms = "Setujui syarat dan kebijakan privasi demo untuk melanjutkan.";
  }
  return validationResult(errors);
}

export function validatePasswordResetForm(
  input: PasswordResetInput,
): ValidationResult {
  const errors: ValidationErrors = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  return validationResult(errors);
}
