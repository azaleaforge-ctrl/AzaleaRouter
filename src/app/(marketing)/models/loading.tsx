import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";

export default function ModelsLoading() {
  return (
    <div aria-busy="true" aria-label="Memuat katalog model" className="container-page py-10">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-16 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
