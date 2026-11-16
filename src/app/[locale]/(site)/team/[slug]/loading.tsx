import { Skeleton } from "@/components/ui/skeleton";

/** Header band, leader block and text lines, matching the department page layout. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="bg-hero h-64 sm:h-80" />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-card border border-border p-8 md:flex-row">
          <Skeleton className="h-48 w-48 shrink-0 rounded-full" />
          <div className="w-full">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-8 w-2/3" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          <Skeleton className="h-7 w-48" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
