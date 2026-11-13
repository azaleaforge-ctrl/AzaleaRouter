import assert from "node:assert/strict";
import test from "node:test";
import { TurnstileVerifier } from "../src/auth/turnstile-verifier.js";

function response(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200 });
}

test("Turnstile requires a successful challenge with matching action and hostname", async () => {
  let consumed = false;
  const database = {
    turnstileTokenUse: {
      create: async () => {
        if (consumed) throw { code: "P2002" };
        consumed = true;
      },
    },
  } as never;
  const verifier = new TurnstileVerifier(database, {
    secretKey: "server-secret",
    expectedHostname: "azalea.example",
    now: () => Date.parse("2026-11-13T10:05:00.000Z"),
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.secret, "server-secret");
      assert.equal(body.response, "turnstile-test-token");
      return response({
        success: true,
        hostname: "azalea.example",
        action: "login",
        challenge_ts: "2026-11-13T10:04:00.000Z",
      });
    },
  });

  await verifier.verify("turnstile-test-token", "login");
  await assert.rejects(verifier.verify("turnstile-test-token", "login"), /already been used/);
});

test("Turnstile rejects hostname and action mismatches", async () => {
  const database = { turnstileTokenUse: { create: async () => ({}) } } as never;
  const verifier = new TurnstileVerifier(database, {
    secretKey: "server-secret",
    expectedHostname: "azalea.example",
    fetchImpl: async () => response({
      success: true,
      hostname: "attacker.example",
      action: "signup",
      challenge_ts: new Date().toISOString(),
    }),
  });

  await assert.rejects(verifier.verify("token-value", "login"), /rejected/);
});
