import type { ApiErrorCode, ApiErrorShape } from "./types";

const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: "Data yang dikirim belum valid.",
  UNAUTHORIZED: "Sesi demo tidak valid. Silakan login kembali.",
  FORBIDDEN: "Akses demo ditolak untuk peran ini.",
  NOT_FOUND: "Data demo tidak ditemukan.",
  CONFLICT: "Data demo sudah berubah. Muat ulang lalu coba lagi.",
  RATE_LIMITED: "Terlalu banyak permintaan demo. Coba lagi nanti.",
  OFFLINE: "Koneksi demo terputus. Data yang tampil mungkin sudah usang.",
  UPSTREAM_UNAVAILABLE: "Layanan demo sedang tidak tersedia. Coba lagi.",
  STREAM_INTERRUPTED: "Stream demo terputus sebelum selesai.",
  CANCELLED: "Permintaan demo dibatalkan.",
  UNKNOWN: "Terjadi kesalahan demo yang tidak diketahui.",
};

const RETRYABLE_CODES: ReadonlySet<ApiErrorCode> = new Set([
  "RATE_LIMITED",
  "OFFLINE",
  "UPSTREAM_UNAVAILABLE",
  "STREAM_INTERRUPTED",
]);

export function errorMessage(code: ApiErrorCode): string {
  return ERROR_MESSAGES[code];
}

export function isRetryable(code: ApiErrorCode): boolean {
  return RETRYABLE_CODES.has(code);
}

export function createError(
  code: ApiErrorCode,
  overrides: Partial<Omit<ApiErrorShape, "code">> = {},
): ApiErrorShape {
  return {
    code,
    message: overrides.message ?? errorMessage(code),
    requestId: overrides.requestId ?? "REQ-DEMO-00000000",
    retryable: overrides.retryable ?? isRetryable(code),
    ...(overrides.fieldErrors ? { fieldErrors: overrides.fieldErrors } : {}),
  };
}

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly requestId: string;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string>;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiClientError";
    this.code = shape.code;
    this.requestId = shape.requestId;
    this.retryable = shape.retryable;
    if (shape.fieldErrors) {
      this.fieldErrors = shape.fieldErrors;
    }
  }

  toShape(): ApiErrorShape {
    return {
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      retryable: this.retryable,
      ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
    };
  }
}

export function isApiClientError(value: unknown): value is ApiClientError {
  return value instanceof ApiClientError;
}

/**
 * Maps any thrown value to a safe shape. Never forwards a stack trace,
 * upstream payload, or secret to the UI.
 */
export function toApiErrorShape(
  error: unknown,
  requestId = "REQ-DEMO-00000000",
): ApiErrorShape {
  if (isApiClientError(error)) {
    return error.toShape();
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return createError("CANCELLED", { requestId });
  }

  if (error instanceof TypeError) {
    return createError("OFFLINE", { requestId });
  }

  return createError("UNKNOWN", { requestId });
}
