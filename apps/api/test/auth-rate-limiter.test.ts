import assert from "node:assert/strict";
import test from "node:test";
import { AuthRateLimiter } from "../src/auth/auth-rate-limiter.js";

test("database-backed auth rate limiter blocks after configured hit count", async () => {
  let count = 0;
  const database = {
    $queryRaw: async () => [{ hit_count: ++count }],
  } as never;
  const limiter = new AuthRateLimiter(database, {
    hashKey: "rate-limit-test-key-not-for-production",
    windowSeconds: 60,
    maximumHits: 2,
    now: () => Date.parse("2026-11-13T10:00:00.000Z"),
  });

  await limiter.consume("login", "192.0.2.1:user@example.test");
  await limiter.consume("login", "192.0.2.1:user@example.test");
  await assert.rejects(
    limiter.consume("login", "192.0.2.1:user@example.test"),
    /Too many authentication attempts/,
  );
});
