import assert from "node:assert/strict";
import test from "node:test";
import { CatalogSourceError, OpenRouterCatalogClient } from "../src/openrouter-client.js";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

test("listChatModels requests only text-capable chat-completion models", async () => {
  let capturedUrl = "";
  let authorization = "";
  const client = new OpenRouterCatalogClient({
    apiKey: "catalog-metadata-test-key",
    pageSize: 10,
    fetchImpl: async (input, init) => {
      capturedUrl = String(input);
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return jsonResponse({ data: [{
        id: "acme/chat-1",
        canonical_slug: "acme/chat-1",
        name: "Chat One",
        architecture: { output_modalities: ["text"] },
        endpoints: ["/api/v1/chat/completions"],
      }] });
    },
  });

  const models = await client.listChatModels();
  const url = new URL(capturedUrl);
  assert.equal(url.pathname, "/api/v1/models");
  assert.equal(url.searchParams.get("output_modalities"), "text");
  assert.equal(url.searchParams.get("endpoints"), "/api/v1/chat/completions");
  assert.equal(authorization, "Bearer catalog-metadata-test-key");
  assert.equal(models[0]?.canonical_slug, "acme/chat-1");
});

test("listModelEndpoints escapes path segments and parses endpoint-specific prices", async () => {
  let capturedUrl = "";
  const client = new OpenRouterCatalogClient({
    apiKey: "catalog-metadata-test-key",
    fetchImpl: async (input) => {
      capturedUrl = String(input);
      return jsonResponse({ data: {
        id: "acme/chat-1",
        name: "Chat One",
        endpoints: [{
          model_id: "acme/chat-1",
          name: "Provider endpoint",
          provider_name: "Provider One",
          tag: "provider-one",
          pricing: { prompt: "0.000001", completion: "0.000002" },
        }],
      } });
    },
  });

  const endpoints = await client.listModelEndpoints("acme/chat-1");
  assert.match(capturedUrl, /\/models\/acme\/chat-1\/endpoints$/);
  assert.equal(endpoints[0]?.pricing.prompt, "0.000001");
});

test("rejects invalid model identifiers and never follows arbitrary URLs", async () => {
  const client = new OpenRouterCatalogClient({
    apiKey: "catalog-metadata-test-key",
    fetchImpl: async () => jsonResponse({ data: [] }),
  });
  await assert.rejects(
    client.listModelEndpoints("https://attacker.example/model"),
    (error: unknown) => error instanceof CatalogSourceError && error.code === "MODEL_ID_INVALID",
  );
});

test("sanitizes upstream authentication and service errors", async () => {
  const client = new OpenRouterCatalogClient({
    apiKey: "catalog-metadata-test-key",
    fetchImpl: async () => jsonResponse({ error: "sensitive upstream response" }, 401),
  });
  await assert.rejects(
    client.listChatModels(),
    (error: unknown) => error instanceof CatalogSourceError &&
      error.code === "UPSTREAM_AUTH_REJECTED" &&
      !error.message.includes("sensitive"),
  );
});
