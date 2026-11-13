import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validateLoginForm,
  validateName,
  validatePassword,
  validatePasswordResetForm,
  validateRegisterForm,
} from "./auth";
import { validateApiKeyCreateForm, validateApiKeyLabel } from "./api-keys";
import { validateChatMessage } from "./chat";
import { validatePasswordChangeForm, validateProfileForm } from "./settings";
import { validateModelColor } from "./usage";
import { validateTopUpAmount, validateTopUpForm } from "./wallet";

describe("auth validation", () => {
  it("accepts a valid email and rejects malformed values", () => {
    expect(validateEmail("rani@demo.test")).toBeNull();
    expect(validateEmail("")).toBe("Email wajib diisi.");
    expect(validateEmail("not-an-email")).toBe("Format email belum valid.");
  });

  it("requires a password with letters and numbers", () => {
    expect(validatePassword("demo1234")).toBeNull();
    expect(validatePassword("short")).toBe("Password minimal 8 karakter.");
    expect(validatePassword("onlyletters")).toBe(
      "Password harus memuat huruf dan angka.",
    );
  });

  it("validates login and reset forms", () => {
    expect(
      validateLoginForm({ email: "rani@demo.test", password: "demo1234" })
        .valid,
    ).toBe(true);
    expect(validateLoginForm({ email: "bad", password: "" }).errors).toEqual({
      email: "Format email belum valid.",
      password: "Password wajib diisi.",
    });
    expect(validatePasswordResetForm({ email: "bad" }).valid).toBe(false);
  });

  it("requires terms acceptance on registration", () => {
    const result = validateRegisterForm({
      name: "Rani Demo",
      email: "rani@demo.test",
      password: "demo1234",
      acceptTerms: false,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.acceptTerms).toContain("Setujui syarat");
  });

  it("validates names", () => {
    expect(validateName("Rani")).toBeNull();
    expect(validateName(" ")).toBe("Nama wajib diisi.");
    expect(validateName("R")).toBe("Nama minimal 2 karakter.");
  });
});

describe("wallet validation", () => {
  it("enforces the demo minimum top-up", () => {
    expect(validateTopUpAmount(50_000)).toBeNull();
    expect(validateTopUpAmount(49_999)).toBe(
      "Minimum top-up demo adalah Rp50.000.",
    );
    expect(validateTopUpAmount(50_000.5)).toBe(
      "Nominal top-up harus bilangan bulat.",
    );
  });

  it("validates the top-up form", () => {
    expect(validateTopUpForm({ amount: 100_000, method: "qris" }).valid).toBe(
      true,
    );
    expect(validateTopUpForm({ amount: 10_000, method: "" }).errors).toEqual({
      amount: "Minimum top-up demo adalah Rp50.000.",
      method: "Pilih metode top-up demo.",
    });
  });
});

describe("API key validation", () => {
  it("requires a non-empty label of at most 50 characters", () => {
    expect(validateApiKeyLabel("Produksi demo")).toBeNull();
    expect(validateApiKeyLabel("")).toBe("Label API key wajib diisi.");
    expect(validateApiKeyLabel("a".repeat(51))).toBe(
      "Label API key maksimal 50 karakter.",
    );
  });

  it("rejects negative limits", () => {
    const result = validateApiKeyCreateForm({
      label: "Demo",
      spendLimitIdr: -1,
      rateLimitPerMinute: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.spendLimitIdr).toBeDefined();
    expect(result.errors.rateLimitPerMinute).toBeDefined();
  });
});

describe("chat validation", () => {
  it("rejects empty and oversized messages", () => {
    expect(validateChatMessage("Halo")).toBeNull();
    expect(validateChatMessage("   ")).toBe("Pesan tidak boleh kosong.");
    expect(validateChatMessage("a".repeat(4_001))).toContain("maksimal 4000");
  });
});

describe("usage validation", () => {
  it("accepts only six-digit hex colors", () => {
    expect(validateModelColor("#4F83E5")).toBeNull();
    expect(validateModelColor("4F83E5")).toContain("format hex");
    expect(validateModelColor("#FFF")).toContain("format hex");
  });
});

describe("settings validation", () => {
  it("validates profile names", () => {
    expect(validateProfileForm({ name: "Rani Demo" }).valid).toBe(true);
    expect(validateProfileForm({ name: "" }).errors.name).toBe(
      "Nama wajib diisi.",
    );
  });

  it("requires a different new password", () => {
    const result = validatePasswordChangeForm({
      currentPassword: "demo1234",
      newPassword: "demo1234",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.newPassword).toContain("berbeda");
  });
});
