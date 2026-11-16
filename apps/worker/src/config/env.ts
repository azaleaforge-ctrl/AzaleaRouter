import { z } from "zod";

const booleanFromEnv = z.preprocess(
  (value) => value === undefined ? false : value === "true" ? true : value === "false" ? false : value,
  z.boolean(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  REDIS_URL: z.string().url().refine(
    (value) => {
      try { return ["redis:", "rediss:"].includes(new URL(value).protocol); }
      catch { return false; }
    },
    "REDIS_URL must use redis:// or rediss://",
  ).optional(),
  WORKER_QUEUE_NAME: z.string().min(1).max(100).regex(/^[a-zA-Z0-9:_-]+$/).default("azalea-router-background"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().url().optional(),
  CATALOG_SYNC_ENABLED: booleanFromEnv.default(false),
  CATALOG_SOURCE_APPROVED: booleanFromEnv.default(false),
  OPENROUTER_CATALOG_API_KEY: z.string().min(1).optional(),
});

export function parseWorkerEnvironment(input: Record<string, string | undefined>) {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid worker environment configuration: ${details}`);
  }

  const value = parsed.data;
  const deploymentEnvironment = value.NODE_ENV === "staging" || value.NODE_ENV === "production";
  const redisUrl = value.REDIS_URL ?? (
    value.NODE_ENV === "development" || value.NODE_ENV === "test"
      ? "redis://127.0.0.1:6379"
      : undefined
  );

  if (!redisUrl) {
    throw new Error("REDIS_URL is required in staging and production; localhost fallback is development/test only.");
  }
  if (deploymentEnvironment && !value.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in staging and production.");
  }

  if (value.DATABASE_URL) {
    const protocol = new URL(value.DATABASE_URL).protocol;
    if (protocol !== "postgres:" && protocol !== "postgresql:") {
      throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
    }
  }

  if (value.CATALOG_SYNC_ENABLED) {
    if (!value.DATABASE_URL) throw new Error("DATABASE_URL is required when catalog sync is enabled.");
    if (!value.CATALOG_SOURCE_APPROVED) throw new Error("CATALOG_SOURCE_APPROVED=true is required before catalog metadata requests.");
    if (!value.OPENROUTER_CATALOG_API_KEY) throw new Error("OPENROUTER_CATALOG_API_KEY is required when catalog sync is enabled.");
  }

  return Object.freeze({ ...value, REDIS_URL: redisUrl });
}

export const env = parseWorkerEnvironment(process.env);
