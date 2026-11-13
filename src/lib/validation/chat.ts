import { validationResult, type ValidationErrors, type ValidationResult } from "./types";

export const MAX_CHAT_MESSAGE_LENGTH = 4_000;

export function validateChatMessage(content: string): string | null {
  const value = content.trim();
  if (!value) {
    return "Pesan tidak boleh kosong.";
  }
  if (value.length > MAX_CHAT_MESSAGE_LENGTH) {
    return `Pesan maksimal ${MAX_CHAT_MESSAGE_LENGTH} karakter.`;
  }
  return null;
}

export function validateChatForm(input: { content: string }): ValidationResult {
  const errors: ValidationErrors = {};
  const contentError = validateChatMessage(input.content);
  if (contentError) errors.content = contentError;
  return validationResult(errors);
}
