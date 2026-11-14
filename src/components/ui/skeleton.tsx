"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** A grey placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-border/70", className)} />;
}

/** Announces loading to screen readers; the skeleton blocks themselves are hidden. */
function LoadingStatus() {
  const t = useTranslations("admin");
  return (
    <span role="status" className="sr-only">
      {t("loading")}
    </span>
  );
}

/** Fallback for admin pages: a heading and a list of cards. */
export function AdminPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl" aria-busy="true">
      <LoadingStatus />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-card border border-border bg-white p-5">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="mt-3 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fallback for a form tab, shown under the builder header while the tab loads. */
export function FormTabSkeleton() {
  return (
    <div aria-busy="true">
      <LoadingStatus />
      <div className="rounded-card border border-border bg-white p-6">
        <Skeleton className="h-6 w-48" />
        <div className="mt-6 grid gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
