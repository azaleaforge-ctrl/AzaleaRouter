import { PageSkeleton } from "@/components/shared/states";

export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Memuat halaman">
      <PageSkeleton rows={4} />
    </div>
  );
}
