import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  REDIS_URL: z.string().url().refine(
    (value) => ["redis:", "rediss:"].includes(new URL(value).protocol),
    "REDIS_URL must use redis:// or rediss://",
  ).default("redis://127.0.0.1:6379"),
  WORKER_QUEUE_NAME: z.string().min(1).max(100).regex(/^[a-zA-Z0-9:_-]+$/).default("azalea-router-background"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid worker environment configuration: ${details}`);
}

if (parsed.data.DATABASE_URL) {
  const protocol = new URL(parsed.data.DATABASE_URL).protocol;
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }
}

export const env = Object.freeze(parsed.data);
