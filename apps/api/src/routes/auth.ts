import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { DatabaseClient } from "@azalea-router/database";
import { requireActiveAccount, requireAuthenticated } from "../middleware/authorization.js";
import { requireCsrf } from "../middleware/csrf.js";
import { HttpError } from "../lib/http-error.js";
import type { AuthRateLimiter } from "../auth/auth-rate-limiter.js";
import type { AuthSessionService } from "../auth/session-service.js";
import type { SupabaseAuthClient } from "../auth/supabase-auth-client.js";
import type { TurnstileVerifier } from "../auth/turnstile-verifier.js";

const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(12).max(128);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  display_name: z.string().trim().min(1).max(80).optional(),
  terms_version: z.string().min(1).max(64),
  privacy_version: z.string().min(1).max(64),
  turnstile_token: z.string().min(1).max(2048),
}).strict();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  turnstile_token: z.string().min(1).max(2048),
}).strict();

const verifySchema = z.object({
  token_hash: z.string().min(8).max(512),
}).strict();

const emailActionSchema = z.object({
  email: emailSchema,
  turnstile_token: z.string().min(1).max(2048),
}).strict();

const passwordResetSchema = z.object({
  token_hash: z.string().min(8).max(512),
  new_password: passwordSchema,
}).strict();

export interface AuthRouterDependencies {
  database: DatabaseClient;
  provider: SupabaseAuthClient;
  sessions: AuthSessionService;
  turnstile: TurnstileVerifier;
  rateLimiter: AuthRateLimiter;
  termsVersion: string;
  privacyVersion: string;
  emailRedirectTo?: string;
  allowedOrigins: string[];
}

function requireAllowedOrigin(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, _res, next) => {
    const origin = req.header("origin");
    if (!origin || !allowed.has(origin)) {
      next(new HttpError(403, "AUTH_ORIGIN_REJECTED", "Request origin is not allowed."));
      return;
    }
    next();
  };
}

function clientAddress(request: Parameters<RequestHandler>[0]): string {
  // Do not trust x-forwarded-for unless a trusted proxy is explicitly configured.
  return request.socket.remoteAddress ?? "unknown";
}

function publicUser(user: {
  id: string;
  emailNormalized: string;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  profile?: { displayName: string | null; locale: string; timezone: string } | null;
}) {
  return {
    id: user.id,
    email: user.emailNormalized,
    role: user.role.toLowerCase(),
    status: user.status.toLowerCase(),
    email_verified: Boolean(user.emailVerifiedAt),
    profile: user.profile ?? null,
  };
}

export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const router = Router();
  const originGuard = requireAllowedOrigin(dependencies.allowedOrigins);
  const csrfGuard = requireCsrf({
    cookieName: dependencies.sessions.csrfCookieName,
    allowedOrigins: dependencies.allowedOrigins,
  });

  router.get("/auth/session", (req, res) => {
    if (!req.auth) {
      res.status(200).json({ authenticated: false, user: null });
      return;
    }

    res.status(200).json({
      authenticated: true,
      user: {
        id: req.auth.userId,
        email: req.auth.email,
        role: req.auth.role,
        status: req.auth.status,
      },
    });
  });

  router.post("/auth/register", originGuard, async (req, res) => {
    const input = registerSchema.parse(req.body);
    if (input.terms_version !== dependencies.termsVersion || input.privacy_version !== dependencies.privacyVersion) {
      throw new HttpError(409, "CONSENT_VERSION_MISMATCH", "Terms or Privacy Policy version is not current.");
    }

    await dependencies.rateLimiter.consume("signup", `${clientAddress(req)}:${input.email}`);
    await dependencies.turnstile.verify(input.turnstile_token, "signup", clientAddress(req));

    const providerResult = await dependencies.provider.signUp(
      input.email,
      input.password,
      dependencies.emailRedirectTo,
    );

    const user = await dependencies.database.user.upsert({
      where: { authSubjectId: providerResult.user.id },
      update: {},
      create: {
        authSubjectId: providerResult.user.id,
        emailNormalized: input.email,
        status: providerResult.user.email_confirmed_at || providerResult.user.confirmed_at
          ? "ACTIVE"
          : "PENDING_VERIFICATION",
        emailVerifiedAt: providerResult.user.email_confirmed_at || providerResult.user.confirmed_at
          ? new Date(providerResult.user.email_confirmed_at ?? providerResult.user.confirmed_at!)
          : null,
        profile: {
          create: {
            displayName: input.display_name ?? null,
            locale: "id-ID",
            timezone: "Asia/Jakarta",
          },
        },
        preferences: { create: {} },
        consents: {
          create: [
            { consentType: "terms", documentVersion: input.terms_version, source: "website" },
            { consentType: "privacy", documentVersion: input.privacy_version, source: "website" },
          ],
        },
      },
      include: { profile: true },
    });

    if (providerResult.session && user.status === "ACTIVE") {
      await dependencies.sessions.createSession(user.id, providerResult.session, res);
    }

    res.status(202).json({
      accepted: true,
      email_verification_required: user.status !== "ACTIVE",
      message: "If the address can be registered, an email verification message will be sent.",
    });
  });

  router.post("/auth/login", originGuard, async (req, res) => {
    const input = loginSchema.parse(req.body);
    await dependencies.rateLimiter.consume("login", `${clientAddress(req)}:${input.email}`);
    await dependencies.turnstile.verify(input.turnstile_token, "login", clientAddress(req));

    const tokens = await dependencies.provider.signIn(input.email, input.password);
    if (!tokens.user.email_confirmed_at && !tokens.user.confirmed_at) {
      throw new HttpError(403, "EMAIL_VERIFICATION_REQUIRED", "Email verification is required before login.");
    }

    const user = await dependencies.database.user.findUnique({
      where: { authSubjectId: tokens.user.id },
    });
    if (!user || user.status !== "ACTIVE" || user.deletedAt) {
      throw new HttpError(403, "ACCOUNT_NOT_ACTIVE", "This account cannot sign in.");
    }

    const session = await dependencies.sessions.createSession(user.id, tokens, res);
    res.status(200).json({
      authenticated: true,
      user: publicUser({ ...user, profile: null }),
      csrf_token: session.csrfToken,
    });
  });

  router.post("/auth/email/verify", originGuard, async (req, res) => {
    const input = verifySchema.parse(req.body);
    await dependencies.rateLimiter.consume("verify-email", clientAddress(req));
    const tokens = await dependencies.provider.verifyEmailToken(input.token_hash, "signup");
    const email = tokens.user.email?.trim().toLowerCase();
    if (!email || !tokens.user.email_confirmed_at && !tokens.user.confirmed_at) {
      throw new HttpError(400, "EMAIL_VERIFICATION_FAILED", "Email verification could not be completed.");
    }

    const user = await dependencies.database.user.update({
      where: { authSubjectId: tokens.user.id },
      data: {
        emailVerifiedAt: new Date(tokens.user.email_confirmed_at ?? tokens.user.confirmed_at!),
        status: "ACTIVE",
      },
    });
    const session = await dependencies.sessions.createSession(user.id, tokens, res);
    res.status(200).json({
      authenticated: true,
      user: publicUser({ ...user, profile: null }),
      csrf_token: session.csrfToken,
    });
  });

  router.post("/auth/email/resend", originGuard, async (req, res) => {
    const input = emailActionSchema.parse(req.body);
    await dependencies.rateLimiter.consume("resend-verification", `${clientAddress(req)}:${input.email}`);
    await dependencies.turnstile.verify(input.turnstile_token, "resend_verification", clientAddress(req));
    await dependencies.provider.resendSignup(input.email);
    res.status(202).json({ accepted: true });
  });

  router.post("/auth/password/forgot", originGuard, async (req, res) => {
    const input = emailActionSchema.parse(req.body);
    await dependencies.rateLimiter.consume("password-reset", `${clientAddress(req)}:${input.email}`);
    await dependencies.turnstile.verify(input.turnstile_token, "password_reset", clientAddress(req));
    await dependencies.provider.recoverPassword(input.email, dependencies.emailRedirectTo);
    res.status(202).json({
      accepted: true,
      message: "If the address is registered, password recovery instructions will be sent.",
    });
  });

  router.post("/auth/password/reset", originGuard, async (req, res) => {
    const input = passwordResetSchema.parse(req.body);
    await dependencies.rateLimiter.consume("password-reset-verify", clientAddress(req));
    const tokens = await dependencies.provider.verifyEmailToken(input.token_hash, "recovery");
    await dependencies.provider.updatePassword(tokens.access_token, input.new_password);
    const user = await dependencies.database.user.update({
      where: { authSubjectId: tokens.user.id },
      data: {
        emailVerifiedAt: tokens.user.email_confirmed_at || tokens.user.confirmed_at
          ? new Date(tokens.user.email_confirmed_at ?? tokens.user.confirmed_at!)
          : undefined,
        status: "ACTIVE",
      },
    });
    const session = await dependencies.sessions.createSession(user.id, tokens, res);
    res.status(200).json({
      authenticated: true,
      user: publicUser({ ...user, profile: null }),
      csrf_token: session.csrfToken,
    });
  });

  router.post("/auth/refresh", requireAuthenticated(), csrfGuard, async (req, res) => {
    res.status(200).json({
      authenticated: true,
      user: {
        id: req.auth!.userId,
        email: req.auth!.email,
        role: req.auth!.role,
        status: req.auth!.status,
      },
    });
  });

  router.post("/auth/logout", requireAuthenticated(), csrfGuard, async (req, res) => {
    await dependencies.sessions.revokeCurrent(req, res);
    res.status(204).end();
  });

  router.get("/me", requireActiveAccount(), async (req, res) => {
    const user = await dependencies.database.user.findFirst({
      where: { id: req.auth!.userId, deletedAt: null },
      include: { profile: true, preferences: true },
    });
    if (!user) throw new HttpError(404, "ACCOUNT_NOT_FOUND", "Account was not found.");
    res.status(200).json({
      user: publicUser(user),
      preferences: user.preferences,
    });
  });

  router.patch("/me/profile", requireActiveAccount(), csrfGuard, async (req, res) => {
    const input = z.object({
      display_name: z.string().trim().min(1).max(80).nullable().optional(),
      locale: z.string().trim().min(2).max(16).optional(),
      timezone: z.string().trim().min(1).max(64).optional(),
    }).strict().parse(req.body);
    const profile = await dependencies.database.userProfile.upsert({
      where: { userId: req.auth!.userId },
      update: {
        ...(input.display_name !== undefined ? { displayName: input.display_name } : {}),
        ...(input.locale ? { locale: input.locale } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
      },
      create: {
        userId: req.auth!.userId,
        displayName: input.display_name ?? null,
        locale: input.locale ?? "id-ID",
        timezone: input.timezone ?? "Asia/Jakarta",
      },
    });
    res.status(200).json({ profile });
  });

  router.patch("/me/preferences", requireActiveAccount(), csrfGuard, async (req, res) => {
    const input = z.object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      default_model_id: z.string().trim().min(1).max(255).nullable().optional(),
      notification_preferences: z.record(z.string(), z.boolean()).optional(),
    }).strict().parse(req.body);
    const preferences = await dependencies.database.userPreference.upsert({
      where: { userId: req.auth!.userId },
      update: {
        ...(input.theme ? { theme: input.theme } : {}),
        ...(input.default_model_id !== undefined ? { defaultModelId: input.default_model_id } : {}),
        ...(input.notification_preferences ? { notificationPreferences: input.notification_preferences } : {}),
      },
      create: {
        userId: req.auth!.userId,
        theme: input.theme ?? "system",
        defaultModelId: input.default_model_id ?? null,
        notificationPreferences: input.notification_preferences ?? {},
      },
    });
    res.status(200).json({ preferences });
  });

  router.get("/me/consents", requireActiveAccount(), async (req, res) => {
    const consents = await dependencies.database.userConsent.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { acceptedAt: "desc" },
      select: { id: true, consentType: true, documentVersion: true, acceptedAt: true, source: true },
    });
    res.status(200).json({ consents });
  });

  router.post("/me/consents", requireActiveAccount(), csrfGuard, async (req, res) => {
    const input = z.object({
      consent_type: z.enum(["terms", "privacy", "marketing"]),
      document_version: z.string().trim().min(1).max(64),
    }).strict().parse(req.body);
    if (
      (input.consent_type === "terms" && input.document_version !== dependencies.termsVersion) ||
      (input.consent_type === "privacy" && input.document_version !== dependencies.privacyVersion)
    ) {
      throw new HttpError(409, "CONSENT_VERSION_MISMATCH", "The requested consent document version is not current.");
    }
    const consent = await dependencies.database.userConsent.create({
      data: {
        userId: req.auth!.userId,
        consentType: input.consent_type,
        documentVersion: input.document_version,
        source: "website",
      },
    });
    res.status(201).json({ consent });
  });

  return router;
}
