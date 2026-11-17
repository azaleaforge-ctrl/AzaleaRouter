import assert from "node:assert/strict";
import test from "node:test";
import { parseQueueRedisConnectionOptions, toQueueJobInspection } from "../src/operations/queue-metrics.js";

test("Redis URL parser supports credentials, database index and bounded retries", () => {
  assert.deepEqual(parseQueueRedisConnectionOptions("redis://queue-user:queue-pass@localhost:6380/4"), {
    host: "localhost", port: 6380, maxRetriesPerRequest: 1, connectTimeout: 3_000,
    username: "queue-user", password: "queue-pass", db: 4,
  });
});
test("Redis URL parser enables TLS for rediss URLs", () => {
  const options = parseQueueRedisConnectionOptions("rediss://redis.example.test:6380");
  assert.deepEqual(options.tls, {});
  assert.equal(options.host, "redis.example.test");
});
test("Redis URL parser rejects non-Redis schemes and unsafe URL components", () => {
  assert.throws(() => parseQueueRedisConnectionOptions("https://redis.example.test"), /redis/);
  assert.throws(() => parseQueueRedisConnectionOptions("redis://redis.example.test/1x"), /database/);
  assert.throws(() => parseQueueRedisConnectionOptions("redis://redis.example.test/#fragment"), /components/);
  assert.throws(() => parseQueueRedisConnectionOptions("redis://redis.example.test/?password=secret"), /components/);
});


test("queue job inspection exposes only allowlisted operational metadata", () => {
  const inspection = toQueueJobInspection({
    id: "catalog-openrouter-sync-6-hourly",
    name: "catalog.openrouter.sync",
    attemptsMade: 3,
    opts: { attempts: 3 },
    timestamp: 1_794_700_000_000,
    processedOn: 1_794_700_001_000,
    finishedOn: 1_794_700_002_000,
    data: { customer_email: "private@example.test", prompt: "private prompt" },
    returnvalue: { upstream_secret: "must-not-leak" },
    failedReason: "provider token secret",
    stacktrace: ["private stack trace"],
  } as never, "failed");

  assert.deepEqual(inspection, {
    id: "catalog-openrouter-sync-6-hourly",
    name: "catalog.openrouter.sync",
    state: "failed",
    attempts_made: 3,
    attempts_allowed: 3,
    created_at: new Date(1_794_700_000_000).toISOString(),
    processed_at: new Date(1_794_700_001_000).toISOString(),
    finished_at: new Date(1_794_700_002_000).toISOString(),
  });
  const serialized = JSON.stringify(inspection);
  assert.equal(serialized.includes("private@example.test"), false);
  assert.equal(serialized.includes("private prompt"), false);
  assert.equal(serialized.includes("must-not-leak"), false);
  assert.equal(serialized.includes("provider token secret"), false);
  assert.equal(serialized.includes("private stack trace"), false);
});

test("queue job inspection normalizes unknown states, names and timestamps", () => {
  const inspection = toQueueJobInspection({
    id: "bad job id",
    name: "job name with spaces",
    attemptsMade: -1,
    opts: { attempts: 0 },
    timestamp: Number.NaN,
    processedOn: -1,
    finishedOn: undefined,
  }, "unexpected-state");

  assert.deepEqual(inspection, {
    id: "unknown",
    name: "unknown",
    state: "unknown",
    attempts_made: 0,
    attempts_allowed: 1,
    created_at: null,
    processed_at: null,
    finished_at: null,
  });
});
