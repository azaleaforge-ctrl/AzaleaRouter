import type { Metadata } from "next";
import { NotificationsClient } from "@/components/user/notifications";

export const metadata: Metadata = {
  title: "Notifikasi",
  description: "Notifikasi billing, usage, keamanan, dan produk (data demo).",
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
