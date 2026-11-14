import assert from "node:assert/strict";
import test from "node:test";
import { createOpaqueToken, decryptAuthToken, encryptAuthToken, sha256 } from "../src/auth/token-crypto.js";

const key = Buffer.alloc(32, 7).toString("base64");

test("opaque tokens are random and SHA-256 hashes are fixed-width", () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();
  assert.notEqual(first, second);
  assert.match(sha256(first), /^[0-9a-f]{64}$/);
});

test("AES-256-GCM encrypts and authenticates provider tokens at rest", () => {
  const secret = "provider-refresh-token-that-must-not-be-stored-plaintext";
  const encrypted = encryptAuthToken(secret, key);
  assert.equal(encrypted.includes(secret), false);
  assert.equal(decryptAuthToken(encrypted, key), secret);
  assert.throws(() => decryptAuthToken(encrypted, Buffer.alloc(32, 8).toString("base64")));
});
