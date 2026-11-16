import { Skeleton } from "@/components/ui/skeleton";

/** Hero band + a year divider + cover cards, matching the events page layout. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="bg-hero h-56 sm:h-72" />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-0.5 flex-1" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-0.5 flex-1" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-card border border-border bg-white">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
