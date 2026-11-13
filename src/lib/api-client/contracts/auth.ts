import type { ApiResult, RequestOptions } from "../types";

export type DemoRole = "user" | "admin";

export interface DemoSession {
  demo: true;
  simulated: true;
  role: DemoRole;
  displayName: string;
  email: string;
  /** The demo never issues a real session token. */
  sessionToken: null;
}

export interface LoginInput {
  email: string;
  password: string;
  turnstileToken?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  turnstileToken?: string;
}

export interface PasswordResetInput {
  email: string;
}

export interface AuthOutcome {
  simulated: true;
  session: DemoSession | null;
  message: string;
  nextStep: "dashboard" | "verify-email" | "check-email";
}

export interface AuthService {
  login(
    input: LoginInput,
    options?: RequestOptions,
  ): Promise<ApiResult<AuthOutcome>>;
  register(
    input: RegisterInput,
    options?: RequestOptions,
  ): Promise<ApiResult<AuthOutcome>>;
  requestPasswordReset(
    input: PasswordResetInput,
    options?: RequestOptions,
  ): Promise<ApiResult<AuthOutcome>>;
  getDemoSession(options?: RequestOptions): Promise<ApiResult<DemoSession>>;
  logout(
    options?: RequestOptions,
  ): Promise<ApiResult<{ simulated: true; message: string }>>;
}
