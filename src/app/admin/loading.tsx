import { PageSkeleton } from "@/components/shared/states";

export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Memuat halaman admin">
      <PageSkeleton rows={4} />
    </div>
  );
}
