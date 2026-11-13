import { describe, expect, it } from "vitest";
import {
  ApiClientError,
  createError,
  errorMessage,
  isApiClientError,
  isRetryable,
  toApiErrorShape,
} from "./errors";

describe("error mapping", () => {
  it("creates safe defaults for a code", () => {
    const error = createError("NOT_FOUND");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Data demo tidak ditemukan.");
    expect(error.retryable).toBe(false);
    expect(error.requestId).toBe("REQ-DEMO-00000000");
  });

  it("marks transient codes as retryable", () => {
    expect(isRetryable("OFFLINE")).toBe(true);
    expect(isRetryable("UPSTREAM_UNAVAILABLE")).toBe(true);
    expect(isRetryable("VALIDATION_ERROR")).toBe(false);
    expect(errorMessage("CANCELLED")).toContain("dibatalkan");
  });

  it("preserves an ApiClientError shape", () => {
    const original = createError("RATE_LIMITED", {
      requestId: "REQ-DEMO-1234",
      fieldErrors: { email: "Email wajib diisi." },
    });
    const mapped = toApiErrorShape(new ApiClientError(original));
    expect(mapped).toEqual(original);
    expect(isApiClientError(new ApiClientError(original))).toBe(true);
  });

  it("maps abort errors to CANCELLED", () => {
    const mapped = toApiErrorShape(
      new DOMException("aborted", "AbortError"),
      "REQ-DEMO-ABORT",
    );
    expect(mapped.code).toBe("CANCELLED");
    expect(mapped.requestId).toBe("REQ-DEMO-ABORT");
  });

  it("maps network-like TypeErrors to OFFLINE", () => {
    expect(toApiErrorShape(new TypeError("fetch failed")).code).toBe("OFFLINE");
  });

  it("never leaks an unknown error message or stack", () => {
    const mapped = toApiErrorShape(new Error("secret upstream payload"));
    expect(mapped.code).toBe("UNKNOWN");
    expect(mapped.message).toBe("Terjadi kesalahan demo yang tidak diketahui.");
    expect(mapped.message).not.toContain("secret");
  });
});
