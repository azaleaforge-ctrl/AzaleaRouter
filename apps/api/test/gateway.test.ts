import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createGatewayRouter } from "../src/routes/gateway.js";

async function startGateway(gatewayOptions: Parameters<typeof createGatewayRouter>[0]): Promise<{ server: Server; url: string }> {
  const router = createGatewayRouter(gatewayOptions);
  const server = createServer(createApp({ gatewayRouter: router }));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Gateway test server failed to bind.");
  return { server, url: `http://127.0.0.1:${address.port}/v1/chat/completions` };
}

async function stop(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

const requestBody = {
  model: "acme/canonical-chat",
  messages: [{ role: "user", content: "hello" }],
};

function options(overrides: Partial<Parameters<typeof createGatewayRouter>[0]> = {}) {
  const model = {
    canonicalSlug: "acme/canonical-chat",
    sourceModelId: "acme/source-id",
    endpoints: [{
      modelVariant: "acme/source-id",
      provider: { slug: "provider-a" },
    }],
  };
  const database = {
    catalogModel: { findFirst: async () => model },
  } as never;
  const apiKeys = {
    authenticate: async () => ({
      apiKeyId: "key-1",
      userId: "user-1",
      userEmail: "user@example.test",
      scopes: ["chat:completions"],
      allowedModelIds: [],
      rateLimitRpm: 60,
      concurrencyLimit: 2,
      spendLimitIdr: null,
    }),
  } as never;
  const usage = {
    preflight: async () => {},
    begin: async () => { throw new Error("Gateway usage begin was not configured in this test."); },
  } as never;
  return {
    database,
    apiKeys,
    usage,
    enabled: false,
    upstreamApproved: false,
    settlementReady: false,
    ...overrides,
  };
}

test("gateway remains closed until upstream approval and usage settlement are active", async () => {
  let providerCalls = 0;
  const { server, url } = await startGateway(options({
    provider: {
      complete: async () => {
        providerCalls += 1;
        return new Response("{}");
      },
      stream: async () => {
        providerCalls += 1;
        return new Response("data: [DONE]\n\n");
      },
    },
    enabled: true,
    upstreamApproved: true,
    settlementReady: false,
  }));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer AZL-${"a".repeat(43)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    assert.equal(response.status, 503);
    const body = await response.json() as { error: { code: string } };
    assert.equal(body.error.code, "GATEWAY_DISABLED");
    assert.equal(providerCalls, 0);
  } finally {
    await stop(server);
  }
});

test("gateway rejects requests without AZL authentication before any provider lookup", async () => {
  let modelLookups = 0;
  const opts = options();
  (opts.database as { catalogModel: { findFirst: () => Promise<unknown> } }).catalogModel.findFirst = async () => {
    modelLookups += 1;
    return null;
  };
  const { server, url } = await startGateway(opts);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    assert.equal(response.status, 401);
    assert.equal(modelLookups, 0);
  } finally {
    await stop(server);
  }
});


test("gateway rejects rate-limited API keys before catalog lookup", async () => {
  const order: string[] = [];
  const opts = options({
    enabled: true,
    upstreamApproved: true,
    settlementReady: true,
    provider: {
      complete: async () => new Response("{}"),
      stream: async () => new Response("data: [DONE]\\n\\n"),
    },
    usage: {
      preflight: async () => {
        order.push("preflight");
        throw new Error("API_KEY_RATE_LIMITED");
      },
      begin: async () => { throw new Error("Usage reservation must not run after a rejected preflight."); },
    } as never,
  });
  (opts.database as unknown as { catalogModel: { findFirst: () => Promise<unknown> } }).catalogModel.findFirst = async () => {
    order.push("catalog");
    return null;
  };
  const { server, url } = await startGateway(opts);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer AZL-${"a".repeat(43)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    assert.equal(response.status, 429);
    const body = await response.json() as { error: { code: string } };
    assert.equal(body.error.code, "API_KEY_RATE_LIMITED");
    assert.deepEqual(order, ["preflight"]);
  } finally {
    await stop(server);
  }
});

test("gateway consumes the preflight RPM window once and passes the prechecked marker to reservation", async () => {
  const order: string[] = [];
  const opts = options({
    enabled: true,
    upstreamApproved: true,
    settlementReady: true,
    provider: {
      complete: async () => new Response("{}"),
      stream: async () => new Response("data: [DONE]\\n\\n"),
    },
    usage: {
      preflight: async () => { order.push("preflight"); },
      begin: async (input: { rateLimitPrechecked?: boolean }) => {
        order.push("begin");
        assert.equal(input.rateLimitPrechecked, true);
        throw new Error("PRICING_NOT_READY");
      },
    } as never,
  });
  (opts.database as unknown as { catalogModel: { findFirst: () => Promise<unknown> } }).catalogModel.findFirst = async () => {
    order.push("catalog");
    return {
      id: "model-1",
      canonicalSlug: "acme/canonical-chat",
      sourceModelId: "acme/source-id",
      maxCompletionTokens: 128,
      endpoints: [{
        id: "endpoint-1",
        modelVariant: "acme/source-id",
        maxCompletionTokens: 128,
        maxPromptTokens: 1000,
        provider: { slug: "provider-a" },
      }],
    };
  };
  const { server, url } = await startGateway(opts);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer AZL-${"a".repeat(43)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    assert.equal(response.status, 503);
    const body = await response.json() as { error: { code: string } };
    assert.equal(body.error.code, "PRICING_NOT_READY");
    assert.deepEqual(order, ["preflight", "catalog", "begin"]);
  } finally {
    await stop(server);
  }
});
