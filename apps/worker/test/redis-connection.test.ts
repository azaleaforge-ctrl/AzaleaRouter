import assert from "node:assert/strict";
import test from "node:test";
import { parseRedisConnectionOptions } from "../src/lib/redis-connection.js";

test("parses Redis URL credentials, database and blocking retry policy", () => {
  const options = parseRedisConnectionOptions("redis://worker:p%40ss@localhost:6380/2");

  assert.equal(options.host, "localhost");
  assert.equal(options.port, 6380);
  assert.equal(options.username, "worker");
  assert.equal(options.password, "p@ss");
  assert.equal(options.db, 2);
  assert.equal(options.maxRetriesPerRequest, null);
  assert.equal(options.tls, undefined);
});

test("enables TLS for rediss URLs", () => {
  const options = parseRedisConnectionOptions("rediss://cache.example.test:6380/0");

  assert.equal(options.host, "cache.example.test");
  assert.equal(options.port, 6380);
  assert.deepEqual(options.tls, {});
});

test("rejects unsupported protocols and invalid database indexes", () => {
  assert.throws(() => parseRedisConnectionOptions("https://localhost:6379"), /protocol/i);
  assert.throws(() => parseRedisConnectionOptions("redis://localhost/not-a-db"), /database index/i);
  assert.throws(() => parseRedisConnectionOptions("redis://localhost/#fragment"), /fragments/i);
});
