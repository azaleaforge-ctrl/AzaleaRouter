import type { ApiResult, ISODateString, RequestOptions } from "../types";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  timezone: string;
  locale: "id-ID";
  avatarInitials: string;
  demo: true;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: "id";
  currencyDisplay: "IDR";
  reducedMotion: boolean;
  defaultModelId: string | null;
  demo: true;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  activeSessions: number;
  lastPasswordChangeAt: ISODateString | null;
  demo: true;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: ISODateString;
  read: boolean;
  kind: "billing" | "usage" | "security" | "product";
  demo: true;
}

export interface SettingsService {
  getProfile(options?: RequestOptions): Promise<ApiResult<UserProfile>>;
  updateProfile(
    input: Partial<Pick<UserProfile, "name" | "company" | "timezone">>,
    options?: RequestOptions,
  ): Promise<ApiResult<UserProfile>>;
  getPreferences(options?: RequestOptions): Promise<ApiResult<UserPreferences>>;
  updatePreferences(
    input: Partial<Omit<UserPreferences, "demo">>,
    options?: RequestOptions,
  ): Promise<ApiResult<UserPreferences>>;
  getSecurity(options?: RequestOptions): Promise<ApiResult<SecuritySettings>>;
  changePassword(
    input: { currentPassword: string; newPassword: string },
    options?: RequestOptions,
  ): Promise<ApiResult<{ simulated: true; message: string }>>;
  listNotifications(
    options?: RequestOptions,
  ): Promise<ApiResult<NotificationItem[]>>;
  markNotificationRead(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResult<NotificationItem>>;
}
