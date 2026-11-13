import { sha256 } from "./token-crypto.js";
import type { DatabaseClient } from "@azalea-router/database";
import { HttpError } from "../lib/http-error.js";

interface SiteverifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
}

export interface TurnstileVerifierOptions {
  secretKey: string;
  expectedHostname: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export class TurnstileVerifier {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  constructor(
    private readonly database: DatabaseClient,
    private readonly options: TurnstileVerifierOptions,
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async verify(token: string, expectedAction: string, remoteIp?: string): Promise<void> {
    if (!token || token.length > 2048) {
      throw new HttpError(400, "TURNSTILE_TOKEN_INVALID", "A valid anti-bot challenge is required.");
    }

    let response: Response;
    try {
      response = await this.fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret: this.options.secretKey,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new HttpError(503, "TURNSTILE_UNAVAILABLE", "Anti-bot verification is temporarily unavailable.");
    }

    if (!response.ok) {
      throw new HttpError(503, "TURNSTILE_UNAVAILABLE", "Anti-bot verification is temporarily unavailable.");
    }

    let result: SiteverifyResponse;
    try {
      result = await response.json() as SiteverifyResponse;
    } catch {
      throw new HttpError(503, "TURNSTILE_INVALID_RESPONSE", "Anti-bot verification returned an invalid response.");
    }

    if (
      result.success !== true ||
      result.hostname !== this.options.expectedHostname ||
      result.action !== expectedAction ||
      !result.challenge_ts
    ) {
      throw new HttpError(400, "TURNSTILE_REJECTED", "Anti-bot verification was rejected.");
    }

    const challengeAt = new Date(result.challenge_ts);
    const ageMs = this.now() - challengeAt.getTime();
    if (!Number.isFinite(challengeAt.getTime()) || ageMs < -60_000 || ageMs > 300_000) {
      throw new HttpError(400, "TURNSTILE_EXPIRED", "Anti-bot challenge has expired.");
    }

    try {
      await this.database.turnstileTokenUse.create({
        data: {
          tokenHash: sha256(token),
          action: expectedAction,
          hostname: this.options.expectedHostname,
          challengeAt,
          expiresAt: new Date(this.now() + 300_000),
        },
      });
    } catch {
      // A unique token hash makes successful validation single-use across API replicas.
      throw new HttpError(400, "TURNSTILE_REPLAYED", "Anti-bot challenge has already been used.");
    }
  }
}
