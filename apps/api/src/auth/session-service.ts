import type { Request, Response } from "express";
import type { DatabaseClient } from "@azalea-router/database";
import type { AuthenticatedPrincipal } from "./types.js";
import type { SessionVerifier } from "./session-verifier.js";
import type { SupabaseAuthClient, SupabaseAuthTokens } from "./supabase-auth-client.js";
import { createOpaqueToken, decryptAuthToken, encryptAuthToken, sha256 } from "./token-crypto.js";

export interface AuthSessionOptions {
  encryptionKey: string;
  encryptionKeyVersion: string;
  secureCookies: boolean;
  maximumAgeSeconds: number;
  now?: () => number;
}

interface StoredSession {
  id: string;
  userId: string;
  sessionTokenHash: string;
  csrfTokenHash: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  encryptionKeyVersion: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  revokedAt: Date | null;
  user: {
    id: string;
    authSubjectId: string;
    emailNormalized: string;
    emailVerifiedAt: Date | null;
    role: "USER" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN";
    status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DELETION_PENDING" | "DELETED";
  };
}

function cookieValue(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const item of header.split(";")) {
    const split = item.indexOf("=");
    if (split < 0 || item.slice(0, split).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(split + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function setCookie(
  response: Response,
  name: string,
  value: string,
  options: { secure: boolean; httpOnly: boolean; maxAgeSeconds: number },
): void {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
  ];
  if (options.httpOnly) attributes.push("HttpOnly");
  if (options.secure) attributes.push("Secure");
  response.append("Set-Cookie", attributes.join("; "));
}

export class AuthSessionService implements SessionVerifier {
  private readonly now: () => number;
  readonly sessionCookieName: string;
  readonly csrfCookieName = "azlr_csrf";

  constructor(
    private readonly database: DatabaseClient,
    private readonly provider: SupabaseAuthClient,
    private readonly options: AuthSessionOptions,
  ) {
    this.now = options.now ?? Date.now;
    this.sessionCookieName = options.secureCookies ? "__Host-azlr_session" : "azlr_session";
  }

  async createSession(
    userId: string,
    tokens: SupabaseAuthTokens,
    response: Response,
  ): Promise<{ csrfToken: string }> {
    const now = this.now();
    const sessionToken = createOpaqueToken(32);
    const csrfToken = createOpaqueToken(32);
    const accessExpiresAt = new Date(now + tokens.expires_in * 1000);
    const refreshExpiresAt = new Date(now + this.options.maximumAgeSeconds * 1000);

    await this.database.authSession.create({
      data: {
        userId,
        sessionTokenHash: sha256(sessionToken),
        csrfTokenHash: sha256(csrfToken),
        encryptedAccessToken: encryptAuthToken(tokens.access_token, this.options.encryptionKey),
        encryptedRefreshToken: encryptAuthToken(tokens.refresh_token, this.options.encryptionKey),
        encryptionKeyVersion: this.options.encryptionKeyVersion,
        accessExpiresAt,
        refreshExpiresAt,
      },
    });

    setCookie(response, this.sessionCookieName, sessionToken, {
      secure: this.options.secureCookies,
      httpOnly: true,
      maxAgeSeconds: this.options.maximumAgeSeconds,
    });
    setCookie(response, this.csrfCookieName, csrfToken, {
      secure: this.options.secureCookies,
      httpOnly: false,
      maxAgeSeconds: this.options.maximumAgeSeconds,
    });
    return { csrfToken };
  }

  clearCookies(response: Response): void {
    setCookie(response, this.sessionCookieName, "", {
      secure: this.options.secureCookies,
      httpOnly: true,
      maxAgeSeconds: 0,
    });
    setCookie(response, this.csrfCookieName, "", {
      secure: this.options.secureCookies,
      httpOnly: false,
      maxAgeSeconds: 0,
    });
  }

  async revokeCurrent(request: Request, response: Response): Promise<void> {
    const token = cookieValue(request.header("cookie"), this.sessionCookieName);
    if (token) {
      const record = await this.database.authSession.findUnique({
        where: { sessionTokenHash: sha256(token) },
      });
      if (record && !record.revokedAt) {
        let accessToken: string | null = null;
        try {
          accessToken = decryptAuthToken(record.encryptedAccessToken, this.options.encryptionKey);
        } catch {
          // Local revocation still proceeds if old key material has been rotated away.
        }
        if (accessToken) {
          try {
            await this.provider.signOut(accessToken);
          } catch {
            // The database revocation is authoritative for AzaleaRouter sessions.
          }
        }
        await this.database.authSession.update({
          where: { id: record.id },
          data: {
            revokedAt: new Date(this.now()),
            encryptedAccessToken: "",
            encryptedRefreshToken: "",
          },
        });
      }
    }
    this.clearCookies(response);
  }

  async resolvePrincipal(request: Request): Promise<unknown | null> {
    const sessionToken = cookieValue(request.header("cookie"), this.sessionCookieName);
    if (!sessionToken) return null;

    const tokenHash = sha256(sessionToken);
    let record = await this.database.authSession.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: { user: true },
    }) as StoredSession | null;

    if (!record || record.revokedAt || record.refreshExpiresAt.getTime() <= this.now()) {
      return null;
    }

    let accessToken: string;
    try {
      accessToken = decryptAuthToken(record.encryptedAccessToken, this.options.encryptionKey);
    } catch {
      return null;
    }

    if (record.accessExpiresAt.getTime() <= this.now() + 60_000) {
      const refreshed = await this.refreshLocked(record.id);
      if (!refreshed) return null;
      record = refreshed;
      accessToken = decryptAuthToken(record.encryptedAccessToken, this.options.encryptionKey);
    }

    const providerUser = await this.provider.getUser(accessToken);
    if (
      !providerUser.email ||
      providerUser.id !== record.user.authSubjectId ||
      providerUser.email.trim().toLowerCase() !== record.user.emailNormalized
    ) return null;

    let user = record.user;
    if (!user.emailVerifiedAt && (providerUser.email_confirmed_at || providerUser.confirmed_at)) {
      user = await this.database.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(providerUser.email_confirmed_at ?? providerUser.confirmed_at!),
          status: user.status === "PENDING_VERIFICATION" ? "ACTIVE" : user.status,
        },
      }) as StoredSession["user"];
    }

    const roleMap = {
      USER: "user",
      SUPPORT: "support",
      ADMIN: "admin",
      SUPER_ADMIN: "super_admin",
    } as const;
    const statusMap = {
      PENDING_VERIFICATION: "pending_verification",
      ACTIVE: "active",
      SUSPENDED: "suspended",
      DELETION_PENDING: "deletion_pending",
      DELETED: "deleted",
    } as const;

    await this.database.authSession.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { lastSeenAt: new Date(this.now()) },
    });

    return {
      userId: user.id,
      email: user.emailNormalized,
      role: roleMap[user.role],
      status: statusMap[user.status],
      sessionId: record.id,
      csrfTokenHash: record.csrfTokenHash,
    } satisfies AuthenticatedPrincipal;
  }

  private async refreshLocked(sessionId: string): Promise<StoredSession | null> {
    return this.database.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "auth_sessions" WHERE "id" = ${sessionId}::uuid FOR UPDATE`;
      const latest = await transaction.authSession.findUnique({
        where: { id: sessionId },
        include: { user: true },
      }) as StoredSession | null;
      if (!latest || latest.revokedAt || latest.refreshExpiresAt.getTime() <= this.now()) return null;

      if (latest.accessExpiresAt.getTime() > this.now() + 60_000) return latest;

      const refreshToken = decryptAuthToken(latest.encryptedRefreshToken, this.options.encryptionKey);
      const tokens = await this.provider.refresh(refreshToken);
      const accessExpiresAt = new Date(this.now() + tokens.expires_in * 1000);
      await transaction.authSession.update({
        where: { id: sessionId },
        data: {
          encryptedAccessToken: encryptAuthToken(tokens.access_token, this.options.encryptionKey),
          encryptedRefreshToken: encryptAuthToken(tokens.refresh_token, this.options.encryptionKey),
          encryptionKeyVersion: this.options.encryptionKeyVersion,
          accessExpiresAt,
          lastSeenAt: new Date(this.now()),
        },
      });
      return await transaction.authSession.findUnique({
        where: { id: sessionId },
        include: { user: true },
      }) as StoredSession | null;
    }, { timeout: 15_000 });
  }
}
