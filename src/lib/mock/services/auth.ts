import type { AuthService } from "@/lib/api-client/contracts/auth";
import type { MockContext } from "../context";
import {
  DEMO_ADMIN_SESSION,
  DEMO_AUTH_MESSAGES,
  DEMO_USER_SESSION,
} from "../fixtures/auth";
import { fail, respond } from "../scenarios";

export function createAuthService(ctx: MockContext): AuthService {
  return {
    async login(input, options) {
      const email = input.email.trim().toLowerCase();
      if (email.startsWith("blocked@")) {
        return fail(ctx, options, "FORBIDDEN");
      }

      return respond(ctx, options, () => ({
        simulated: true,
        session: email.startsWith("admin@")
          ? DEMO_ADMIN_SESSION
          : DEMO_USER_SESSION,
        message: DEMO_AUTH_MESSAGES.login,
        nextStep: "dashboard",
      }));
    },

    async register(_input, options) {
      return respond(ctx, options, () => ({
        simulated: true,
        session: null,
        message: DEMO_AUTH_MESSAGES.register,
        nextStep: "verify-email",
      }));
    },

    async requestPasswordReset(_input, options) {
      return respond(ctx, options, () => ({
        simulated: true,
        session: null,
        message: DEMO_AUTH_MESSAGES.reset,
        nextStep: "check-email",
      }));
    },

    async getDemoSession(options) {
      return respond(ctx, options, () => DEMO_USER_SESSION);
    },

    async logout(options) {
      return respond(ctx, options, () => ({
        simulated: true as const,
        message:
          "Logout disimulasikan. Tidak ada sesi nyata yang diakhiri.",
      }));
    },
  };
}
