import assert from "node:assert/strict";
import test from "node:test";
import { parseQueueRedisConnectionOptions } from "../src/operations/queue-metrics.js";

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
