import { createServer } from "node:http";
import { createDatabaseClient } from "@azalea-router/database";
import { LocalSandboxPaymentAdapter, PaymentService, WalletService } from "@azalea-router/billing";
import { createOpenRouterCatalogSyncHandler } from "@azalea-router/catalog";
import { AuthRateLimiter } from "./auth/auth-rate-limiter.js";
import { ApiKeyService } from "./auth/api-key-service.js";
import { OpenRouterProviderAdapter } from "./gateway/openrouter-adapter.js";
import { AuthSessionService } from "./auth/session-service.js";
import { SupabaseAuthClient } from "./auth/supabase-auth-client.js";
import { TurnstileVerifier } from "./auth/turnstile-verifier.js";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createAuthRouter } from "./routes/auth.js";
import { createBillingRouter } from "./routes/billing.js";
import { createApiKeyRouter } from "./routes/api-keys.js";
import { createGatewayRouter } from "./routes/gateway.js";

async function start(): Promise<void> {
  const database = env.DATABASE_URL
    ? createDatabaseClient(env.DATABASE_URL)
    : undefined;

  if (database) await database.$connect();

  let auth: {
    router: ReturnType<typeof createAuthRouter>;
    sessionVerifier: AuthSessionService;
  } | undefined;

  if (env.AUTH_PROVIDER === "supabase") {
    if (!database) throw new Error("Database is required when AUTH_PROVIDER=supabase.");
    const provider = new SupabaseAuthClient({
      url: env.SUPABASE_URL!,
      anonKey: env.SUPABASE_ANON_KEY!,
    });
    const sessions = new AuthSessionService(database, provider, {
      encryptionKey: env.AUTH_TOKEN_ENCRYPTION_KEY!,
      encryptionKeyVersion: env.AUTH_TOKEN_ENCRYPTION_KEY_VERSION,
      secureCookies: env.AUTH_COOKIE_SECURE,
      maximumAgeSeconds: env.AUTH_SESSION_MAX_AGE_SECONDS,
    });
    const turnstile = new TurnstileVerifier(database, {
      secretKey: env.TURNSTILE_SECRET_KEY!,
      expectedHostname: env.TURNSTILE_EXPECTED_HOSTNAME!,
    });
    const rateLimiter = new AuthRateLimiter(database, {
      hashKey: env.AUTH_RATE_LIMIT_HASH_KEY!,
      windowSeconds: 300,
      maximumHits: 10,
    });

    auth = {
      sessionVerifier: sessions,
      router: createAuthRouter({
        database,
        provider,
        sessions,
        turnstile,
        rateLimiter,
        termsVersion: env.AUTH_TERMS_VERSION!,
        privacyVersion: env.AUTH_PRIVACY_VERSION!,
        ...(env.AUTH_EMAIL_REDIRECT_URL ? { emailRedirectTo: env.AUTH_EMAIL_REDIRECT_URL } : {}),
        allowedOrigins: [env.WEB_ORIGIN!],
      }),
    };
  }

  let billingRouter: ReturnType<typeof createBillingRouter> | undefined;
  if (database) {
    const wallet = new WalletService(database);
    const payment = env.PAYMENT_PROVIDER === "sandbox"
      ? new PaymentService(
          database,
          new LocalSandboxPaymentAdapter(env.PAYMENT_SANDBOX_WEBHOOK_SECRET!),
          { intentLifetimeSeconds: env.PAYMENT_INTENT_LIFETIME_SECONDS },
        )
      : undefined;
    billingRouter = createBillingRouter({
      database,
      wallet,
      ...(payment ? { payment } : {}),
      csrfCookieName: auth?.sessionVerifier.csrfCookieName ?? "azlr_csrf",
      allowedOrigins: env.WEB_ORIGIN ? [env.WEB_ORIGIN] : [],
    });
  }

  const apiKeyRouter = database && env.API_KEY_HASH_PEPPER
    ? createApiKeyRouter(
        apiKeyService!,
        {
          csrfCookieName: auth?.sessionVerifier.csrfCookieName ?? "azlr_csrf",
          allowedOrigins: env.WEB_ORIGIN ? [env.WEB_ORIGIN] : [],
        },
      )
    : undefined;

  const apiKeyService = database && env.API_KEY_HASH_PEPPER
    ? new ApiKeyService(database, env.API_KEY_HASH_PEPPER, env.API_KEY_PEPPER_VERSION)
    : undefined;

  const gatewayRouter = database && apiKeyService
    ? createGatewayRouter({
        database,
        apiKeys: apiKeyService,
        enabled: env.GATEWAY_ENABLED,
        upstreamApproved: env.UPSTREAM_PROVIDER_APPROVED,
        settlementReady: env.BILLING_SETTLEMENT_ENABLED,
        ...(env.GATEWAY_ENABLED ? { provider: new OpenRouterProviderAdapter(env.UPSTREAM_OPENROUTER_API_KEY!) } : {}),
      })
    : undefined;

  const app = createApp({
    ...(database ? { database } : {}),
    ...(auth ? { authRouter: auth.router, sessionVerifier: auth.sessionVerifier } : {}),
    ...(billingRouter ? { billingRouter } : {}),
    ...(apiKeyRouter ? { apiKeyRouter } : {}),
    ...(gatewayRouter ? { gatewayRouter } : {}),
  });
  const server = createServer(app);
  server.listen(env.API_PORT, env.API_HOST, () => {
    logger.info("api.server.started", {
      host: env.API_HOST,
      port: env.API_PORT,
      environment: env.NODE_ENV,
    });
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info("api.server.shutdown", { signal });
    server.close((error) => {
      if (error) {
        logger.error("api.server.shutdown.error");
        process.exitCode = 1;
      }
      void database?.$disconnect().catch(() => {
        logger.error("api.server.database_disconnect.error");
        process.exitCode = 1;
      });
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void start().catch(() => {
  logger.error("api.server.startup.failed", { code: "STARTUP_FAILED" });
  process.exitCode = 1;
});
