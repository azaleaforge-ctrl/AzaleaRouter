import { HttpError } from "../lib/http-error.js";

export interface SupabaseAuthUser {
  id: string;
  email: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
}

export interface SupabaseAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: SupabaseAuthUser;
}

export interface SupabaseSignupResult {
  user: SupabaseAuthUser;
  session: SupabaseAuthTokens | null;
}

export interface SupabaseAuthClientOptions {
  url: string;
  anonKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function parseUser(value: unknown): SupabaseAuthUser {
  if (!value || typeof value !== "object") {
    throw new HttpError(502, "AUTH_PROVIDER_INVALID_RESPONSE", "Identity provider returned an invalid response.");
  }
  const user = value as Record<string, unknown>;
  if (typeof user.id !== "string" || typeof user.email !== "string") {
    throw new HttpError(502, "AUTH_PROVIDER_INVALID_RESPONSE", "Identity provider returned an invalid user.");
  }
  return {
    id: user.id,
    email: user.email,
    email_confirmed_at: typeof user.email_confirmed_at === "string" ? user.email_confirmed_at : null,
    confirmed_at: typeof user.confirmed_at === "string" ? user.confirmed_at : null,
    user_metadata: user.user_metadata && typeof user.user_metadata === "object"
      ? user.user_metadata as Record<string, unknown>
      : {},
  };
}

function parseTokens(value: unknown): SupabaseAuthTokens {
  if (!value || typeof value !== "object") {
    throw new HttpError(502, "AUTH_PROVIDER_INVALID_RESPONSE", "Identity provider returned an invalid token response.");
  }
  const response = value as Record<string, unknown>;
  if (
    typeof response.access_token !== "string" ||
    typeof response.refresh_token !== "string" ||
    typeof response.expires_in !== "number" ||
    typeof response.token_type !== "string" ||
    !response.user
  ) {
    throw new HttpError(502, "AUTH_PROVIDER_INVALID_RESPONSE", "Identity provider returned an invalid token response.");
  }
  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_in: response.expires_in,
    token_type: response.token_type,
    user: parseUser(response.user),
  };
}

/**
 * Minimal GoTrue/Supabase Auth REST adapter.
 * It holds only the publishable/anon key; service-role credentials are never accepted.
 */
export class SupabaseAuthClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: SupabaseAuthClientOptions) {
    this.baseUrl = options.url.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    map?: (value: unknown) => T,
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/auth/v1${path}`, {
        ...init,
        headers: {
          apikey: this.options.anonKey,
          accept: "application/json",
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...init.headers,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new HttpError(503, "AUTH_PROVIDER_UNAVAILABLE", "Authentication service is temporarily unavailable.");
    }

    const text = await response.text();
    let value: unknown = {};
    if (text) {
      try {
        value = JSON.parse(text);
      } catch {
        throw new HttpError(502, "AUTH_PROVIDER_INVALID_RESPONSE", "Authentication service returned an invalid response.");
      }
    }

    if (!response.ok) {
      if (response.status === 400 || response.status === 401 || response.status === 422) {
        throw new HttpError(401, "AUTH_INVALID_CREDENTIALS", "The supplied authentication details are invalid or expired.");
      }
      if (response.status === 429) {
        throw new HttpError(429, "AUTH_PROVIDER_RATE_LIMITED", "Authentication requests are temporarily rate limited.");
      }
      throw new HttpError(502, "AUTH_PROVIDER_ERROR", "Authentication service could not complete the request.");
    }
    return map ? map(value) : value as T;
  }

  async signUp(email: string, password: string, redirectTo?: string): Promise<SupabaseSignupResult> {
    const path = redirectTo ? `/signup?redirect_to=${encodeURIComponent(redirectTo)}` : "/signup";
    const result = await this.request<unknown>(path, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = result as Record<string, unknown>;
    const user = parseUser(data.user ?? data);
    const session = data.access_token && data.refresh_token ? parseTokens(data) : null;
    return { user, session };
  }

  async signIn(email: string, password: string): Promise<SupabaseAuthTokens> {
    return this.request("/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, parseTokens);
  }

  async refresh(refreshToken: string): Promise<SupabaseAuthTokens> {
    return this.request("/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }, parseTokens);
  }

  async getUser(accessToken: string): Promise<SupabaseAuthUser> {
    return this.request("/user", {
      method: "GET",
      headers: { authorization: `Bearer ${accessToken}` },
    }, parseUser);
  }

  async verifyEmailToken(tokenHash: string, type: "signup" | "recovery"): Promise<SupabaseAuthTokens> {
    return this.request("/verify", {
      method: "POST",
      body: JSON.stringify({ token_hash: tokenHash, type }),
    }, parseTokens);
  }

  async resendSignup(email: string): Promise<void> {
    await this.request("/resend", {
      method: "POST",
      body: JSON.stringify({ email, type: "signup" }),
    });
  }

  async recoverPassword(email: string, redirectTo?: string): Promise<void> {
    await this.request("/recover", {
      method: "POST",
      body: JSON.stringify({ email, ...(redirectTo ? { redirect_to: redirectTo } : {}) }),
    });
  }

  async updatePassword(accessToken: string, password: string): Promise<void> {
    await this.request("/user", {
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ password }),
    });
  }

  async signOut(accessToken: string): Promise<void> {
    await this.request("/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
    });
  }
}
