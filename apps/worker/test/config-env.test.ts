import assert from "node:assert/strict";
import test from "node:test";
import { parseWorkerEnvironment } from "../src/config/env.js";

const databaseUrl = "postgresql://azalea:test-only@127.0.0.1:5432/azalea_router";

test("development and test may use the local Redis fallback", () => {
  assert.equal(
    parseWorkerEnvironment({ NODE_ENV: "development" }).REDIS_URL,
    "redis://127.0.0.1:6379",
  );
  assert.equal(
    parseWorkerEnvironment({ NODE_ENV: "test" }).REDIS_URL,
    "redis://127.0.0.1:6379",
  );
});

test("staging and production require explicit Redis and PostgreSQL configuration", () => {
  assert.throws(
    () => parseWorkerEnvironment({ NODE_ENV: "staging", DATABASE_URL: databaseUrl }),
    /REDIS_URL is required in staging and production/,
  );
  assert.throws(
    () => parseWorkerEnvironment({ NODE_ENV: "production", REDIS_URL: "redis://redis.internal:6379" }),
    /DATABASE_URL is required in staging and production/,
  );
});

test("deployment environments accept explicit Redis and PostgreSQL URLs", () => {
  const value = parseWorkerEnvironment({
    NODE_ENV: "production",
    REDIS_URL: "rediss://worker:secret@redis.internal:6380/3",
    DATABASE_URL: databaseUrl,
  });

  assert.equal(value.REDIS_URL, "rediss://worker:secret@redis.internal:6380/3");
  assert.equal(value.DATABASE_URL, databaseUrl);
  assert.equal(value.WORKER_QUEUE_NAME, "azalea-router-background");
});

test("worker configuration rejects non-PostgreSQL database URLs", () => {
  assert.throws(
    () => parseWorkerEnvironment({
      NODE_ENV: "production",
      REDIS_URL: "redis://redis.internal:6379",
      DATABASE_URL: "https://database.internal",
    }),
    /DATABASE_URL must use the postgres/,
  );
});
