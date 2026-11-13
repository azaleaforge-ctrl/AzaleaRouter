import assert from "node:assert/strict";
import test from "node:test";
import { OpenRouterProviderAdapter } from "../src/gateway/openrouter-adapter.js";

test("provider adapter sends only the fixed upstream endpoint and returns OpenAI-compatible body", async () => {
  let url = "";
  let authorization = "";
  let sent: Record<string, unknown> = {};
  const adapter = new OpenRouterProviderAdapter("upstream-test-secret", {
    fetchImpl: async (input, init) => {
      url = String(input);
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ id: "chatcmpl-test", choices: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const response = await adapter.complete({
    model: "vendor/model-variant",
    providerSlug: "provider-a",
    stream: false,
    messages: [{ role: "user", content: "hello" }],
    temperature: 0.2,
  });

  assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(authorization, "Bearer upstream-test-secret");
  assert.equal(sent.model, "vendor/model-variant");
  assert.equal(sent.stream, false);
  assert.deepEqual(sent.provider, { order: ["provider-a"], allow_fallbacks: false });
  assert.equal(response.status, 200);
  const payload = await response.json() as { id: string };
  assert.equal(payload.id, "chatcmpl-test");
});

test("provider adapter never exposes upstream error bodies or credentials", async () => {
  const adapter = new OpenRouterProviderAdapter("upstream-secret-do-not-leak", {
    fetchImpl: async () => new Response("secret raw provider trace", { status: 401 }),
  });
  const response = await adapter.complete({
    model: "vendor/model",
    providerSlug: "provider-a",
    stream: false,
    messages: [{ role: "user", content: "hello" }],
  });
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.equal(body.includes("secret raw provider trace"), false);
  assert.equal(body.includes("upstream-secret-do-not-leak"), false);
});

test("provider adapter maps network errors to sanitized unavailable responses", async () => {
  const adapter = new OpenRouterProviderAdapter("upstream-secret-do-not-leak", {
    fetchImpl: async () => { throw new Error("sensitive network diagnostic"); },
  });
  const response = await adapter.stream({
    model: "vendor/model",
    providerSlug: "provider-a",
    stream: true,
    messages: [{ role: "user", content: "hello" }],
  });
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.equal(body.includes("sensitive network diagnostic"), false);
});
