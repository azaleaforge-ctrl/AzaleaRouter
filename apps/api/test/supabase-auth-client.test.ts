import assert from "node:assert/strict";
import test from "node:test";
import { SupabaseAuthClient } from "../src/auth/supabase-auth-client.js";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const user = {
  id: "92b19ea0-f85b-4de0-b567-3f182deca003",
  email: "user@example.test",
  email_confirmed_at: "2026-11-13T10:00:00.000Z",
  identities: [{ id: "identity-1", provider: "email" }],
};

test("Supabase password grant sends anon key and parses verified identity tokens", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const client = new SupabaseAuthClient({
    url: "https://auth.example.test/",
    anonKey: "publishable-test-key",
    fetchImpl: async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return jsonResponse({
        access_token: "access-token-test",
        refresh_token: "refresh-token-test",
        expires_in: 3600,
        token_type: "bearer",
        user,
      });
    },
  });

  const tokens = await client.signIn("user@example.test", "not-a-real-password");
  assert.equal(capturedUrl, "https://auth.example.test/auth/v1/token?grant_type=password");
  assert.equal(new Headers(capturedInit?.headers).get("apikey"), "publishable-test-key");
  assert.equal(tokens.user.id, user.id);
  assert.equal(tokens.refresh_token, "refresh-token-test");
});

test("Supabase Auth errors are sanitized before reaching API clients", async () => {
  const client = new SupabaseAuthClient({
    url: "https://auth.example.test",
    anonKey: "publishable-test-key",
    fetchImpl: async () => jsonResponse({ msg: "internal SQL details and password data" }, 400),
  });

  await assert.rejects(
    client.signIn("user@example.test", "wrong-password"),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "AUTH_INVALID_CREDENTIALS");
      assert.equal((error as Error).message, "The supplied authentication details are invalid or expired.");
      assert.equal((error as Error).message.includes("internal SQL"), false);
      return true;
    },
  );
});

test("signup rejects Supabase-obfuscated existing-user identities", async () => {
  const client = new SupabaseAuthClient({
    url: "https://auth.example.test",
    anonKey: "publishable-test-key",
    fetchImpl: async () => jsonResponse({
      user: { id: user.id, email: user.email, identities: [] },
      session: null,
    }),
  });

  await assert.rejects(client.signUp(user.email, "long-test-password"), /Registration could not be completed/);
});
