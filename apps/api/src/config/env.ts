import { z } from "zod";

const booleanFromEnv = z.preprocess(
  (value) => value === undefined
    ? false
    : value === "true"
      ? true
      : value === "false"
        ? false
        : value,
  z.boolean(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  WEB_ORIGIN: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),

  // Supabase is an optional identity-provider adapter, not an approved
  // commercial/provider decision. It remains disabled unless explicitly enabled.
  AUTH_PROVIDER: z.enum(["disabled", "supabase"]).default("disabled"),
  AUTH_PROVIDER_APPROVED: booleanFromEnv.default(false),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  AUTH_TOKEN_ENCRYPTION_KEY: z.string().optional(),
  AUTH_TOKEN_ENCRYPTION_KEY_VERSION: z.string().min(1).max(32).default("v1"),
  AUTH_RATE_LIMIT_HASH_KEY: z.string().min(32).optional(),
  AUTH_COOKIE_SECURE: booleanFromEnv.default(false),
  AUTH_SESSION_MAX_AGE_SECONDS: z.coerce.number().int().min(300).max(60 * 60 * 24 * 60).default(60 * 60 * 24 * 14),
  AUTH_EMAIL_REDIRECT_URL: z.string().url().optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  TURNSTILE_EXPECTED_HOSTNAME: z.string().min(1).max(253).optional(),
  AUTH_TERMS_VERSION: z.string().min(1).max(64).optional(),
  AUTH_PRIVACY_VERSION: z.string().min(1).max(64).optional(),
  API_KEY_HASH_PEPPER: z.string().min(32).optional(),
  API_KEY_PEPPER_VERSION: z.string().min(1).max(32).default("v1"),
  GATEWAY_ENABLED: booleanFromEnv.default(false),
  UPSTREAM_PROVIDER_APPROVED: booleanFromEnv.default(false),
  BILLING_SETTLEMENT_ENABLED: booleanFromEnv.default(false),
  USAGE_SETTLEMENT_ENABLED: booleanFromEnv.default(false),
  USAGE_REPLAY_WINDOW_SECONDS: z.coerce.number().int().min(60).max(7 * 24 * 60 * 60).default(86_400),
  USAGE_EXPORT_MAX_ROWS: z.coerce.number().int().min(100).max(20_000).default(5_000),
  UPSTREAM_OPENROUTER_API_KEY: z.string().min(1).optional(),
  UPSTREAM_COMMERCIAL_APPROVAL_REFERENCE: z.string().min(8).max(255).optional(),
  PAYMENT_PROVIDER: z.enum(["disabled", "sandbox"]).default("disabled"),
  PAYMENT_PROVIDER_APPROVED: booleanFromEnv.default(false),
  PAYMENT_SANDBOX_WEBHOOK_SECRET: z.string().min(32).optional(),
  PAYMENT_INTENT_LIFETIME_SECONDS: z.coerce.number().int().min(60).max(86_400).default(1_800),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid API environment configuration: ${details}`);
}

const value = parsed.data;
if (value.NODE_ENV === "production" && !value.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in production.");
}

if (value.AUTH_PROVIDER === "supabase") {
  const required: Array<[string, string | undefined]> = [
    ["DATABASE_URL", value.DATABASE_URL],
    ["SUPABASE_URL", value.SUPABASE_URL],
    ["SUPABASE_ANON_KEY", value.SUPABASE_ANON_KEY],
    ["AUTH_TOKEN_ENCRYPTION_KEY", value.AUTH_TOKEN_ENCRYPTION_KEY],
    ["AUTH_RATE_LIMIT_HASH_KEY", value.AUTH_RATE_LIMIT_HASH_KEY],
    ["TURNSTILE_SECRET_KEY", value.TURNSTILE_SECRET_KEY],
    ["TURNSTILE_EXPECTED_HOSTNAME", value.TURNSTILE_EXPECTED_HOSTNAME],
    ["AUTH_TERMS_VERSION", value.AUTH_TERMS_VERSION],
    ["AUTH_PRIVACY_VERSION", value.AUTH_PRIVACY_VERSION],
    ["WEB_ORIGIN", value.WEB_ORIGIN],
  ];
  const missing = required.filter(([, item]) => !item).map(([name]) => name);
  if (missing.length) throw new Error(`Supabase auth is missing required configuration: ${missing.join(", ")}`);
  if (!value.AUTH_PROVIDER_APPROVED) {
    throw new Error("AUTH_PROVIDER=supabase requires AUTH_PROVIDER_APPROVED=true after identity-provider/security review.");
  }
  if (value.NODE_ENV !== "development" && value.NODE_ENV !== "test" && !value.AUTH_COOKIE_SECURE) {
    throw new Error("AUTH_COOKIE_SECURE=true is required outside development/test.");
  }
  if (value.NODE_ENV !== "development" && value.NODE_ENV !== "test") {
    if (!value.WEB_ORIGIN?.startsWith("https://")) {
      throw new Error("WEB_ORIGIN must use HTTPS outside development/test.");
    }
    if (!value.SUPABASE_URL?.startsWith("https://")) {
      throw new Error("SUPABASE_URL must use HTTPS outside development/test.");
    }
  }
  if (value.AUTH_EMAIL_REDIRECT_URL && value.WEB_ORIGIN) {
    const redirectOrigin = new URL(value.AUTH_EMAIL_REDIRECT_URL).origin;
    if (redirectOrigin !== new URL(value.WEB_ORIGIN).origin) {
      throw new Error("AUTH_EMAIL_REDIRECT_URL must use the configured WEB_ORIGIN.");
    }
  }
  const key = value.SUPABASE_ANON_KEY!;
  if (key.startsWith("sb_secret_")) {
    throw new Error("SUPABASE_ANON_KEY must not be a service-role/secret key.");
  }
  if (key.split(".").length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1]!, "base64url").toString("utf8")) as { role?: string };
      if (payload.role === "service_role") {
        throw new Error("SUPABASE_ANON_KEY must not be a service-role/secret key.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("service-role")) throw error;
      // Non-JWT publishable keys are supported; token signature is validated by Supabase.
    }
  }
  let encryptionKey: Buffer;
  try {
    encryptionKey = Buffer.from(value.AUTH_TOKEN_ENCRYPTION_KEY!, "base64");
  } catch {
    throw new Error("AUTH_TOKEN_ENCRYPTION_KEY must be base64-encoded 32-byte key material.");
  }
  if (encryptionKey.length !== 32) {
    throw new Error("AUTH_TOKEN_ENCRYPTION_KEY must be base64-encoded 32-byte key material.");
  }
}

if (value.GATEWAY_ENABLED) {
  if (!value.UPSTREAM_PROVIDER_APPROVED || !value.UPSTREAM_COMMERCIAL_APPROVAL_REFERENCE) {
    throw new Error("Gateway activation requires documented upstream commercial approval.");
  }
  if (!value.BILLING_SETTLEMENT_ENABLED || !value.USAGE_SETTLEMENT_ENABLED) {
    throw new Error("Gateway activation requires wallet and usage reservation/settlement to be enabled.");
  }
  if (!value.UPSTREAM_OPENROUTER_API_KEY) {
    throw new Error("Gateway activation requires an upstream credential in server-side secret storage.");
  }
}

if (value.PAYMENT_PROVIDER === "sandbox") {
  if (!value.PAYMENT_PROVIDER_APPROVED) {
    throw new Error("PAYMENT_PROVIDER=sandbox requires PAYMENT_PROVIDER_APPROVED=true.");
  }
  if (value.NODE_ENV === "production") {
    throw new Error("The local HMAC sandbox payment adapter is forbidden in production.");
  }
  if (!value.DATABASE_URL || !value.PAYMENT_SANDBOX_WEBHOOK_SECRET) {
    throw new Error("Sandbox payments require DATABASE_URL and PAYMENT_SANDBOX_WEBHOOK_SECRET.");
  }
}

export const env = Object.freeze(value);
