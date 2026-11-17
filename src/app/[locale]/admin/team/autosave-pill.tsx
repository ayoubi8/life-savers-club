"use client";

import { useTranslations } from "next-intl";
import { Check, CloudOff, Loader2, PencilLine, TriangleAlert } from "lucide-react";
import type { AutosaveStatus } from "@/lib/team/autosave";
import { cn } from "@/lib/utils";

/** "Saved automatically" indicator for the department editor tabs. */
export function AutosavePill({ status, onRetry, invalid }: { status: AutosaveStatus; onRetry: () => void; invalid?: string }) {
  const t = useTranslations("adminTeam.autosave");
  const Icon = { saved: Check, pending: PencilLine, saving: Loader2, error: CloudOff, invalid: TriangleAlert }[status];
  return (
    <p
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center justify-center gap-1.5 text-center text-xs font-bold",
        status === "saved" ? "text-green" : status === "error" || status === "invalid" ? "text-pink" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", status === "saving" && "animate-spin")} aria-hidden />
      {status === "invalid" ? (invalid ?? t("invalid")) : t(status)}
      {status === "error" && (
        <button type="button" onClick={onRetry} className="underline hover:no-underline">
          {t("retry")}
        </button>
      )}
    </p>
  );
}
