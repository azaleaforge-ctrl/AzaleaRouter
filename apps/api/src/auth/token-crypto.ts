import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { HttpError } from "../lib/http-error.js";

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function parseEncryptionKey(encoded: string): Buffer {
  let key: Buffer;
  try {
    key = Buffer.from(encoded, "base64");
  } catch {
    throw new HttpError(503, "AUTH_ENCRYPTION_NOT_CONFIGURED", "Authentication token encryption is not configured.");
  }
  if (key.length !== 32) {
    throw new HttpError(503, "AUTH_ENCRYPTION_NOT_CONFIGURED", "Authentication token encryption key must be 32 bytes encoded as base64.");
  }
  return key;
}

/** AES-256-GCM authenticated encryption for upstream access/refresh tokens at rest. */
export function encryptAuthToken(value: string, encodedKey: string): string {
  const key = parseEncryptionKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptAuthToken(value: string, encodedKey: string): string {
  const key = parseEncryptionKey(encodedKey);
  const parts = value.split(".");
  if (parts.length !== 3) throw new HttpError(500, "AUTH_TOKEN_CIPHERTEXT_INVALID", "Stored authentication session cannot be decrypted.");
  try {
    const [ivPart, tagPart, ciphertextPart] = parts;
    const iv = Buffer.from(ivPart!, "base64url");
    const tag = Buffer.from(tagPart!, "base64url");
    const ciphertext = Buffer.from(ciphertextPart!, "base64url");
    if (iv.length !== 12 || tag.length !== 16) throw new Error("invalid ciphertext framing");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new HttpError(500, "AUTH_TOKEN_CIPHERTEXT_INVALID", "Stored authentication session cannot be decrypted.");
  }
}
