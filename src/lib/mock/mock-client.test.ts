import { describe, expect, it } from "vitest";
import type { ChatStreamEvent } from "@/lib/api-client/contracts/chat";
import type { ApiResult } from "@/lib/api-client/types";
import { createMockApiClient, type MockConfig } from "./index";
import { DEMO_CHAT_REPLIES } from "./fixtures/chat";

const NOW = new Date("2026-11-13T09:00:00.000Z");

function client(config: MockConfig = {}) {
  return createMockApiClient({
    latencyMs: 0,
    streamChunkDelayMs: 0,
    now: () => NOW,
    ...config,
  });
}

function expectOk<T>(result: ApiResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected success, received ${result.error.code}`);
  }
  return result.data;
}

async function collect(
  stream: AsyncIterable<ChatStreamEvent>,
): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe("catalog mock service", () => {
  it("exposes every service group on the client boundary", () => {
    expect(Object.keys(client()).sort()).toEqual([
      "admin",
      "apiKeys",
      "auth",
      "catalog",
      "chat",
      "content",
      "settings",
      "usage",
      "wallet",
    ]);
  });

  it("returns a paginated illustrative catalog", async () => {
    const result = await client().catalog.list({ pageSize: 5 });
    const data = expectOk(result);
    expect(data.page.total).toBe(12);
    expect(data.page.items).toHaveLength(5);
    expect(data.page.hasMore).toBe(true);
    expect(data.launchReady).toBe(false);
    expect(result.meta.demo).toBe(true);
    expect(result.meta.notice).toContain("Data demo ilustratif");
  });

  it("searches by model name, ID, and developer", async () => {
    const data = expectOk(await client().catalog.search("azalea"));
    expect(data.total).toBe(3);
    expect(data.items.map((item) => item.slug)).toContain("azalea-chat-1");
  });

  it("combines category and availability filters", async () => {
    const coding = expectOk(
      await client().catalog.list({ category: "coding" }),
    );
    expect(coding.page.total).toBe(2);

    const availableCoding = expectOk(
      await client().catalog.list({ category: "coding", onlyAvailable: true }),
    );
    expect(availableCoding.page.total).toBe(1);
  });

  it("returns featured models in popularity order", async () => {
    const featured = expectOk(await client().catalog.featured());
    expect(featured).toHaveLength(4);
    expect(featured[0]?.id).toBe("aurora-labs/azalea-chat-1");
  });

  it("returns detail by provider and slug, and NOT_FOUND otherwise", async () => {
    const detail = expectOk(
      await client().catalog.getDetail("aurora-labs", "azalea-chat-1"),
    );
    expect(detail.endpoints.length).toBeGreaterThan(0);
    expect(detail.demo).toBe(true);

    const missing = await client().catalog.getDetail("aurora-labs", "missing");
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe("NOT_FOUND");
    }
  });

  it("supports the empty scenario", async () => {
    const data = expectOk(
      await client({ scenario: "empty" }).catalog.list(),
    );
    expect(data.page.total).toBe(0);
    expect(data.page.items).toEqual([]);
    expect(data.totalCatalogSize).toBe(0);
  });
});

describe("scenario behavior", () => {
  it("returns a safe retryable error for the error scenario", async () => {
    const result = await client({ scenario: "error" }).catalog.list();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UPSTREAM_UNAVAILABLE");
      expect(result.error.retryable).toBe(true);
    }
  });

  it("marks offline results as offline", async () => {
    const result = await client({ scenario: "offline" }).wallet.getSnapshot();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OFFLINE");
      expect(result.meta.connection).toBe("offline");
    }
  });

  it("marks stale and reconnect snapshots", async () => {
    const stale = await client({ scenario: "stale" }).wallet.getSnapshot();
    expect(stale.ok).toBe(true);
    expect(stale.meta.stale).toBe(true);

    const reconnect = await client({
      scenario: "reconnect",
    }).wallet.getSnapshot();
    expect(reconnect.ok).toBe(true);
    expect(reconnect.meta.connection).toBe("reconnecting");
  });

  it("resolves the delayed scenario without changing data", async () => {
    const result = await client({ scenario: "delayed" }).catalog.list();
    expect(result.ok).toBe(true);
    expect(result.meta.scenario).toBe("delayed");
  });
});

describe("wallet mock service", () => {
  it("returns a labeled simulated snapshot", async () => {
    const snapshot = expectOk(await client().wallet.getSnapshot());
    expect(snapshot.simulated).toBe(true);
    expect(snapshot.currency).toBe("IDR");
    expect(snapshot.availableBalance).toBe(1_250_000);
    expect(snapshot.reservedBalance).toBe(75_000);
  });

  it("filters transactions by type", async () => {
    const page = expectOk(
      await client().wallet.listTransactions({ type: "top_up" }),
    );
    expect(page.total).toBe(2);
    expect(page.items.every((item) => item.type === "top_up")).toBe(true);
  });

  it("rejects a top-up below the demo minimum", async () => {
    const result = await client().wallet.createTopUp({
      amount: 10_000,
      method: "qris",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.fieldErrors?.amount).toContain("Rp50.000");
    }
  });

  it("returns an explicitly simulated top-up", async () => {
    const topUp = expectOk(
      await client().wallet.createTopUp({ amount: 100_000, method: "qris" }),
    );
    expect(topUp.simulated).toBe(true);
    expect(topUp.isRealPayment).toBe(false);
    expect(topUp.status).toBe("simulated_pending");
    expect(topUp.amount).toBe(100_000);
  });
});

describe("API key mock service", () => {
  it("creates a visibly fake, non-usable token", async () => {
    const reveal = expectOk(
      await client().apiKeys.create({ label: "Demo baru" }),
    );
    expect(reveal.tokenUsable).toBe(false);
    expect(reveal.tokenKind).toBe("demo-non-usable");
    expect(reveal.revealOnce).toBe(true);
    expect(reveal.secret.startsWith("AZL-DEMO-")).toBe(true);
    expect(reveal.secret.endsWith("-NOT-A-REAL-KEY")).toBe(true);
    expect(reveal.key.maskedKey.endsWith("••••")).toBe(true);
    expect(reveal.key.maskedKey).not.toBe(reveal.secret);
  });

  it("revokes an existing key", async () => {
    const key = expectOk(await client().apiKeys.revoke("KEY-DEMO-0001"));
    expect(key.status).toBe("revoked");
    expect(key.revokedAt).not.toBeNull();
  });

  it("rotates a key and returns a new one-time secret", async () => {
    const reveal = expectOk(await client().apiKeys.rotate("KEY-DEMO-0002"));
    expect(reveal.tokenUsable).toBe(false);
    expect(reveal.key.status).toBe("active");
    expect(reveal.secret.startsWith("AZL-DEMO-")).toBe(true);
  });

  it("is deterministic for the same clock and input", async () => {
    const first = expectOk(
      await client().apiKeys.create({ label: "Deterministik" }),
    );
    const second = expectOk(
      await client().apiKeys.create({ label: "Deterministik" }),
    );
    expect(second.secret).toBe(first.secret);
    expect(second.key.id).toBe(first.key.id);
  });
});

describe("chat mock service", () => {
  it("streams deterministic chunks and a terminal done event", async () => {
    const events = await collect(
      client().chat.streamMessage({
        conversationId: "CONV-DEMO-0001",
        content: "Halo demo",
      }),
    );

    expect(events[0]?.type).toBe("start");
    expect(events.some((event) => event.type === "usage")).toBe(true);
    expect(events.at(-1)?.type).toBe("done");

    const text = events
      .filter(
        (event): event is Extract<ChatStreamEvent, { type: "delta" }> =>
          event.type === "delta",
      )
      .map((event) => event.text)
      .join("");
    expect(text).toBe(DEMO_CHAT_REPLIES.general);
  });

  it("interrupts the stream without a done event", async () => {
    const events = await collect(
      client({ scenario: "stream-interrupted" }).chat.streamMessage({
        conversationId: "CONV-DEMO-0001",
        content: "Halo demo",
      }),
    );

    expect(events.some((event) => event.type === "interrupted")).toBe(true);
    expect(events.some((event) => event.type === "done")).toBe(false);
  });

  it("cancels when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const events = await collect(
      client().chat.streamMessage(
        { conversationId: "CONV-DEMO-0001", content: "Halo demo" },
        { signal: controller.signal },
      ),
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("cancelled");
  });

  it("returns NOT_FOUND for an unknown conversation", async () => {
    const result = await client().chat.getConversation("CONV-MISSING");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("usage mock service", () => {
  it("returns a provisional summary", async () => {
    const summary = expectOk(await client().usage.getSummary());
    expect(summary.provisional).toBe(true);
    expect(summary.simulated).toBe(true);
    expect(summary.totalRequests).toBe(128);
  });

  it("filters requests by source", async () => {
    const page = expectOk(
      await client().usage.listRequests({ source: "api-key" }),
    );
    expect(page.total).toBe(3);
  });

  it("updates a model color only with a valid hex value", async () => {
    const invalid = await client().usage.updateModelColor({
      modelId: "aurora-labs/azalea-chat-1",
      colorHex: "blue",
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe("VALIDATION_ERROR");
    }

    const updated = expectOk(
      await client().usage.updateModelColor({
        modelId: "aurora-labs/azalea-chat-1",
        colorHex: "#123456",
      }),
    );
    expect(updated.colorHex).toBe("#123456");
    expect(updated.source).toBe("manual");
  });
});

describe("content, settings, and admin mock services", () => {
  it("returns labeled demo content and status", async () => {
    const docs = expectOk(await client().content.listDocs());
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0]?.articles[0]?.demo).toBe(true);

    const status = expectOk(await client().content.getStatus());
    expect(status.simulated).toBe(true);
    expect(status.components).toHaveLength(6);
  });

  it("marks a notification as read", async () => {
    const notification = expectOk(
      await client().settings.markNotificationRead("NOTIF-DEMO-0001"),
    );
    expect(notification.read).toBe(true);
  });

  it("returns simulated admin mutations that never persist", async () => {
    const result = expectOk(
      await client().admin.setUserStatus({
        userId: "USR-DEMO-0001",
        status: "suspended",
        reason: "Contoh simulasi",
      }),
    );
    expect(result.simulated).toBe(true);
    expect(result.applied).toBe(false);
    expect(result.auditEntry.simulated).toBe(true);
  });

  it("returns NOT_FOUND for an unknown admin target", async () => {
    const result = await client().admin.refreshProvider({
      providerId: "missing-provider",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("auth mock service", () => {
  it("returns a demo session without a real token", async () => {
    const outcome = expectOk(
      await client().auth.login({
        email: "rani@demo.test",
        password: "demo1234",
      }),
    );
    expect(outcome.simulated).toBe(true);
    expect(outcome.session?.sessionToken).toBeNull();
    expect(outcome.session?.role).toBe("user");
  });

  it("selects the admin demo role by email prefix", async () => {
    const outcome = expectOk(
      await client().auth.login({
        email: "admin@demo.test",
        password: "demo1234",
      }),
    );
    expect(outcome.session?.role).toBe("admin");
  });

  it("returns FORBIDDEN for the blocked demo account", async () => {
    const result = await client().auth.login({
      email: "blocked@demo.test",
      password: "demo1234",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });
});
