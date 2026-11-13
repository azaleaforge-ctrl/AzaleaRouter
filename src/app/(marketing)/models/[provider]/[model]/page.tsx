import type { Metadata } from "next";
import { ModelDetailClient } from "@/components/marketing/model-detail";
import { api } from "@/components/shared/api";

interface Props {
  params: Promise<{ provider: string; model: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provider, model } = await params;
  const res = await api.catalog.getDetail(provider, model);
  if (res.ok) {
    return {
      title: `${res.data.name} — ${res.data.developer.name}`,
      description: res.data.description,
    };
  }
  return { title: "Detail Model", description: "Detail model tidak ditemukan di katalog demo." };
}

export default function ModelDetailPage({ params }: Props) {
  return <ModelDetailClient params={params} />;
}
