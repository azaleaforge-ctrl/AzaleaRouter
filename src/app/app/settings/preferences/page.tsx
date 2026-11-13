import type { Metadata } from "next";
import { PreferencesClient } from "@/components/user/settings-preferences";

export const metadata: Metadata = {
  title: "Preferensi",
  description: "Tema, bahasa, dan preferensi tampilan demo.",
};

export default function PreferencesSettingsPage() {
  return <PreferencesClient />;
}
