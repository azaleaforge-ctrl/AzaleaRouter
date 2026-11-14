import { createHmac } from "node:crypto";
import type { DatabaseClient } from "@azalea-router/database";
import { HttpError } from "../lib/http-error.js";

export interface AuthRateLimitOptions {
  hashKey: string;
  windowSeconds: number;
  maximumHits: number;
  now?: () => number;
}

export class AuthRateLimiter {
  private readonly now: () => number;

  constructor(
    private readonly database: DatabaseClient,
    private readonly options: AuthRateLimitOptions,
  ) {
    this.now = options.now ?? Date.now;
  }

  async consume(scope: string, identity: string): Promise<void> {
    const bucketHash = createHmac("sha256", this.options.hashKey)
      .update(`${scope.toLowerCase()}: ${identity.toLowerCase()}`)
      .digest("hex");
    const windowMs = this.options.windowSeconds * 1000;
    const windowStart = new Date(Math.floor(this.now() / windowMs) * windowMs);
    const expiresAt = new Date(windowStart.getTime() + windowMs * 2);

    const rows = await this.database.$queryRaw<Array<{ hit_count: number }>>`
      INSERT INTO "auth_rate_limits"
        ("id", "bucket_hash", "window_start", "hit_count", "expires_at", "created_at")
      VALUES
        (gen_random_uuid(), ${bucketHash}, ${windowStart}, 1, ${expiresAt}, CURRENT_TIMESTAMP)
      ON CONFLICT ("bucket_hash", "window_start")
      DO UPDATE SET "hit_count" = "auth_rate_limits"."hit_count" + 1
      RETURNING "hit_count"
    `;

    if (!rows[0] || Number(rows[0].hit_count) > this.options.maximumHits) {
      throw new HttpError(429, "AUTH_RATE_LIMITED", "Too many authentication attempts. Try again later.");
    }
  }
}
