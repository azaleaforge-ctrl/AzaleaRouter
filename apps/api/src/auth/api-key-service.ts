import { createHmac, randomBytes } from "node:crypto";
import type { DatabaseClient } from "@azalea-router/database";
import { z } from "zod";

const allowedScopes = ["chat:completions"] as const;
const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.enum(allowedScopes)).min(1).max(1).default(["chat:completions"]),
  allowed_model_ids: z.array(z.string().trim().min(3).max(255)).max(100).default([]),
  spend_limit_idr: z.string().regex(/^(?:0|[1-9]\d{0,37})$/).optional(),
  rate_limit_rpm: z.number().int().min(1).max(10_000).default(60),
  concurrency_limit: z.number().int().min(1).max(100).default(2),
  expires_at: z.string().datetime().optional(),
}).strict();

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export interface IssuedApiKey {
  id: string;
  name: string;
  key_prefix: string;
  api_key: string;
  scopes: string[];
  allowed_model_ids: string[];
  rate_limit_rpm: number;
  concurrency_limit: number;
  spend_limit_idr: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ApiKeyPrincipal {
  apiKeyId: string;
  userId: string;
  userEmail: string;
  scopes: string[];
  allowedModelIds: string[];
  rateLimitRpm: number;
  concurrencyLimit: number;
  spendLimitIdr: string | null;
}

export class ApiKeyService {
  constructor(
    private readonly database: DatabaseClient,
    private readonly pepper: string,
    private readonly pepperVersion: string,
  ) {
    if (pepper.length < 32) throw new Error("API key hashing pepper must contain at least 32 characters.");
  }

  private createSecret(): { token: string; prefix: string; hash: string } {
    const token = `AZL-${randomBytes(32).toString("base64url")}`;
    return {
      token,
      prefix: token.slice(0, 12),
      hash: createHmac("sha256", this.pepper).update(token, "utf8").digest("hex"),
    };
  }

  private async loadIssuedKey(userId: string, id: string, token: string): Promise<IssuedApiKey> {
    const key = await this.database.apiKey.findFirstOrThrow({
      where: { id, userId },
    });
    return {
      id: key.id,
      name: key.name,
      key_prefix: key.keyPrefix,
      api_key: token,
      scopes: key.scopes,
      allowed_model_ids: key.allowedModelIds,
      rate_limit_rpm: key.rateLimitRpm,
      concurrency_limit: key.concurrencyLimit,
      spend_limit_idr: key.spendLimitIdr?.toString() ?? null,
      expires_at: key.expiresAt?.toISOString() ?? null,
      created_at: key.createdAt.toISOString(),
    };
  }

  async create(userId: string, rawInput: unknown): Promise<IssuedApiKey> {
    const input = createApiKeySchema.parse(rawInput);
    const now = new Date();
    const expiresAt = input.expires_at ? new Date(input.expires_at) : null;
    if (expiresAt && expiresAt.getTime() <= now.getTime()) {
      throw new RangeError("API key expiry must be in the future.");
    }
    const secret = this.createSecret();
    const key = await this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const activeCount = await tx.apiKey.count({ where: { userId, status: "active" } });
      if (activeCount >= 20) throw new Error("API_KEY_LIMIT_REACHED");
      return tx.apiKey.create({
      data: {
        userId,
        name: input.name,
        keyPrefix: secret.prefix,
        tokenHash: secret.hash,
        pepperVersion: this.pepperVersion,
        scopes: input.scopes,
        allowedModelIds: [...new Set(input.allowed_model_ids)],
        spendLimitIdr: input.spend_limit_idr ?? null,
        rateLimitRpm: input.rate_limit_rpm,
        concurrencyLimit: input.concurrency_limit,
        status: "active",
        expiresAt,
      },
    });
    }, { isolationLevel: "Serializable", timeout: 15_000 });
    return this.loadIssuedKey(userId, key.id, secret.token);
  }

  async rotate(userId: string, keyId: string): Promise<IssuedApiKey> {
    const secret = this.createSecret();
    const createdId = await this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "api_keys" WHERE "id" = ${keyId}::uuid AND "user_id" = ${userId}::uuid FOR UPDATE`;
      const current = await tx.apiKey.findFirst({ where: { id: keyId, userId } });
      if (!current || current.status !== "active") throw new Error("API_KEY_NOT_ACTIVE");

      const replacement = await tx.apiKey.create({
        data: {
          userId,
          name: current.name,
          keyPrefix: secret.prefix,
          tokenHash: secret.hash,
          pepperVersion: this.pepperVersion,
          scopes: current.scopes,
          allowedModelIds: current.allowedModelIds,
          spendLimitIdr: current.spendLimitIdr,
          rateLimitRpm: current.rateLimitRpm,
          concurrencyLimit: current.concurrencyLimit,
          status: "active",
          expiresAt: current.expiresAt,
          rotatedFromId: current.id,
        },
      });
      await tx.apiKey.update({
        where: { id: current.id },
        data: { status: "rotated", revokedAt: new Date() },
      });
      return replacement.id;
    }, { isolationLevel: "Serializable", timeout: 15_000 });

    return this.loadIssuedKey(userId, createdId, secret.token);
  }

  async revoke(userId: string, keyId: string): Promise<{ id: string; status: string }> {
    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "api_keys" WHERE "id" = ${keyId}::uuid AND "user_id" = ${userId}::uuid FOR UPDATE`;
      const key = await tx.apiKey.findFirst({ where: { id: keyId, userId } });
      if (!key) throw new Error("API_KEY_NOT_FOUND");
      if (key.status === "active") {
        const updated = await tx.apiKey.update({
          where: { id: key.id },
          data: { status: "revoked", revokedAt: new Date() },
        });
        return { id: updated.id, status: updated.status };
      }
      return { id: key.id, status: key.status };
    }, { isolationLevel: "Serializable", timeout: 15_000 });
  }

  async list(userId: string) {
    const keys = await this.database.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        allowedModelIds: true,
        spendLimitIdr: true,
        rateLimitRpm: true,
        concurrencyLimit: true,
        status: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      key_prefix: key.keyPrefix,
      scopes: key.scopes,
      allowed_model_ids: key.allowedModelIds,
      spend_limit_idr: key.spendLimitIdr?.toString() ?? null,
      rate_limit_rpm: key.rateLimitRpm,
      concurrency_limit: key.concurrencyLimit,
      status: key.status,
      expires_at: key.expiresAt?.toISOString() ?? null,
      last_used_at: key.lastUsedAt?.toISOString() ?? null,
      revoked_at: key.revokedAt?.toISOString() ?? null,
      created_at: key.createdAt.toISOString(),
    }));
  }

  async authenticate(token: string): Promise<ApiKeyPrincipal> {
    if (!/^AZL-[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("API_KEY_INVALID");
    const tokenHash = createHmac("sha256", this.pepper).update(token, "utf8").digest("hex");
    const key = await this.database.apiKey.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, emailNormalized: true, status: true } } },
    });
    const now = new Date();
    if (!key || key.status !== "active" || (key.expiresAt && key.expiresAt <= now)) {
      throw new Error("API_KEY_INVALID");
    }
    if (key.user.status !== "ACTIVE") throw new Error("API_KEY_ACCOUNT_INACTIVE");

    // Monotonic update avoids races between concurrent requests and never logs the secret.
    await this.database.$executeRaw`
      UPDATE "api_keys"
      SET "last_used_at" = GREATEST(COALESCE("last_used_at", '-infinity'::timestamptz), ${now})
      WHERE "id" = ${key.id}::uuid AND "status" = 'active'
    `;

    return {
      apiKeyId: key.id,
      userId: key.userId,
      userEmail: key.user.emailNormalized,
      scopes: key.scopes,
      allowedModelIds: key.allowedModelIds,
      rateLimitRpm: key.rateLimitRpm,
      concurrencyLimit: key.concurrencyLimit,
      spendLimitIdr: key.spendLimitIdr?.toString() ?? null,
    };
  }
}
