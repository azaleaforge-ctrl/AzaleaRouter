import type { Metadata } from "next";
import { ProfileClient } from "@/components/user/settings-profile";

export const metadata: Metadata = {
  title: "Profil",
  description: "Kelola profil akun demo.",
};

export default function ProfileSettingsPage() {
  return <ProfileClient />;
}
