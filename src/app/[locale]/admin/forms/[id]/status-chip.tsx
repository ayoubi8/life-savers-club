"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ResponseStatus } from "@/lib/forms/responses-query";

const tone: Record<ResponseStatus, string> = {
  new: "bg-pink text-white",
  reviewed: "bg-blue/10 text-blue",
  accepted: "bg-green/15 text-green",
  rejected: "bg-grey/10 text-grey",
  spam: "bg-border text-muted-foreground",
};

export function StatusChip({ status }: { status: ResponseStatus }) {
  const t = useTranslations("adminForms.results.status");
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide", tone[status])}>
      {t(status)}
    </span>
  );
}
