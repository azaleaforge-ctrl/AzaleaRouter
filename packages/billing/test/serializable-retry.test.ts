import assert from "node:assert/strict";
import test from "node:test";
import { runSerializableWithRetry } from "../src/wallet-service.js";

test("serializable retry retries only P2034 and returns the committed result", async () => {
  let attempts = 0;
  const result = await runSerializableWithRetry(async () => {
    attempts += 1;
    if (attempts < 3) {
      throw Object.assign(new Error("serialization conflict"), { code: "P2034" });
    }
    return "committed";
  });

  assert.equal(result, "committed");
  assert.equal(attempts, 3);
});

test("serializable retry does not retry unrelated Prisma errors", async () => {
  const expected = Object.assign(new Error("unique constraint"), { code: "P2002" });
  let attempts = 0;

  await assert.rejects(
    runSerializableWithRetry(async () => {
      attempts += 1;
      throw expected;
    }),
    (actual) => actual === expected,
  );

  assert.equal(attempts, 1);
});

test("serializable retry stops after three serialization conflicts", async () => {
  const expected = Object.assign(new Error("serialization conflict"), { code: "P2034" });
  let attempts = 0;

  await assert.rejects(
    runSerializableWithRetry(async () => {
      attempts += 1;
      throw expected;
    }),
    (actual) => actual === expected,
  );

  assert.equal(attempts, 3);
});
