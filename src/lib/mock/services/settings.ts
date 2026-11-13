import type { SettingsService } from "@/lib/api-client/contracts/settings";
import {
  validatePasswordChangeForm,
  validateProfileForm,
} from "@/lib/validation/settings";
import type { MockContext } from "../context";
import {
  DEMO_NOTIFICATIONS,
  DEMO_PREFERENCES,
  DEMO_PROFILE,
  DEMO_SECURITY,
} from "../fixtures/settings";
import { fail, respond } from "../scenarios";

export function createSettingsService(ctx: MockContext): SettingsService {
  return {
    async getProfile(options) {
      return respond(ctx, options, () => DEMO_PROFILE);
    },

    async updateProfile(input, options) {
      const validation = validateProfileForm({
        name: input.name ?? DEMO_PROFILE.name,
        company: input.company,
        timezone: input.timezone,
      });
      if (!validation.valid) {
        return fail(ctx, options, "VALIDATION_ERROR", {
          fieldErrors: validation.errors,
        });
      }
      return respond(ctx, options, () => ({
        ...DEMO_PROFILE,
        ...input,
      }));
    },

    async getPreferences(options) {
      return respond(ctx, options, () => DEMO_PREFERENCES);
    },

    async updatePreferences(input, options) {
      return respond(ctx, options, () => ({
        ...DEMO_PREFERENCES,
        ...input,
      }));
    },

    async getSecurity(options) {
      return respond(ctx, options, () => DEMO_SECURITY);
    },

    async changePassword(input, options) {
      const validation = validatePasswordChangeForm(input);
      if (!validation.valid) {
        return fail(ctx, options, "VALIDATION_ERROR", {
          fieldErrors: validation.errors,
        });
      }
      return respond(ctx, options, () => ({
        simulated: true as const,
        message:
          "Perubahan password disimulasikan. Tidak ada password nyata yang diubah.",
      }));
    },

    async listNotifications(options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty" ? [] : [...DEMO_NOTIFICATIONS],
      );
    },

    async markNotificationRead(id, options) {
      const notification = DEMO_NOTIFICATIONS.find((item) => item.id === id);
      if (!notification) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, () => ({ ...notification, read: true }));
    },
  };
}
