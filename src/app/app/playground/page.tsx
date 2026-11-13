import type { Metadata } from "next";
import { PlaygroundClient } from "@/components/user/playground";

export const metadata: Metadata = {
  title: "API Playground",
  description: "Uji request ke API demo: pilih model, parameter, dan lihat respons + estimasi biaya.",
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
