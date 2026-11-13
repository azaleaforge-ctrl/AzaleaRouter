import type { Metadata } from "next";
import { ChatClient } from "@/components/user/chat";

export const metadata: Metadata = {
  title: "AI Chat",
  description: "Chat umum dan coding dengan streaming tersimulasi. Tidak ada request ke upstream.",
};

export default function ChatPage() {
  return <ChatClient />;
}
