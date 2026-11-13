import type {
  ChatConversation,
  ChatMessage,
} from "@/lib/api-client/contracts/chat";

export const DEMO_CHAT_REPLIES = {
  general:
    "Ini adalah respons demo dari AzaleaRouter. Tidak ada permintaan ke model atau layanan upstream yang dikirim. Balasan ini disusun dari fixture lokal untuk menguji tampilan streaming, pembatalan, dan status error. Saldo dan biaya yang terlihat hanyalah ilustrasi.",
  coding:
    "Berikut contoh demo tanpa menjalankan kode:\n\n```ts\nexport function demoTotal(items: number[]): number {\n  return items.reduce((sum, item) => sum + item, 0);\n}\n```\n\nFungsi ini hanya contoh tampilan code block. Tidak ada eksekusi, validasi, atau panggilan upstream.",
} as const;

function message(
  id: string,
  role: ChatMessage["role"],
  content: string,
  createdAt: string,
  modelId: string | null,
  inputTokens: number | null,
  outputTokens: number | null,
  estimatedCostIdr: number | null,
): ChatMessage {
  return {
    id,
    role,
    content,
    createdAt,
    status: "completed",
    modelId,
    inputTokens,
    outputTokens,
    estimatedCostIdr,
    simulated: true,
  };
}

export const DEMO_CONVERSATIONS: readonly ChatConversation[] = [
  {
    id: "CONV-DEMO-0001",
    title: "Ringkasan dokumen demo",
    mode: "general",
    modelId: "aurora-labs/azalea-chat-1",
    archived: false,
    createdAt: "2026-11-13T07:30:00.000Z",
    updatedAt: "2026-11-13T07:35:00.000Z",
    simulated: true,
    messages: [
      message(
        "MSG-DEMO-0001",
        "user",
        "Tolong ringkas catatan rapat demo ini.",
        "2026-11-13T07:30:00.000Z",
        null,
        null,
        null,
        null,
      ),
      message(
        "MSG-DEMO-0002",
        "assistant",
        DEMO_CHAT_REPLIES.general,
        "2026-11-13T07:30:04.000Z",
        "aurora-labs/azalea-chat-1",
        18,
        64,
        120,
      ),
      message(
        "MSG-DEMO-0003",
        "user",
        "Tampilkan versi yang lebih singkat.",
        "2026-11-13T07:34:00.000Z",
        null,
        null,
        null,
        null,
      ),
    ],
  },
  {
    id: "CONV-DEMO-0002",
    title: "Contoh fungsi TypeScript",
    mode: "coding",
    modelId: "aurora-labs/azalea-code-1",
    archived: false,
    createdAt: "2026-11-12T15:10:00.000Z",
    updatedAt: "2026-11-12T15:12:00.000Z",
    simulated: true,
    messages: [
      message(
        "MSG-DEMO-0004",
        "user",
        "Buat contoh fungsi TypeScript untuk menjumlahkan angka.",
        "2026-11-12T15:10:00.000Z",
        null,
        null,
        null,
        null,
      ),
      message(
        "MSG-DEMO-0005",
        "assistant",
        DEMO_CHAT_REPLIES.coding,
        "2026-11-12T15:10:06.000Z",
        "aurora-labs/azalea-code-1",
        24,
        96,
        180,
      ),
    ],
  },
];
