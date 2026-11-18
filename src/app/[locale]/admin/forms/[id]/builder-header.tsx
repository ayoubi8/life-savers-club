"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleAlert, CircleCheck, Eye, ExternalLink, LoaderCircle, Redo2, Undo2 } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LinkPending } from "@/components/ui/link-pending";
import { cn } from "@/lib/utils";
import { useBuilder, type SaveStatus } from "./builder-provider";
import { statusClass } from "./builder-shared";
import { PreviewDrawer } from "./preview-drawer";
import { PublishButton } from "./publish-button";

const TABS = ["edit", "design", "share", "results", "integrations", "settings"] as const;

function SavePill({ status, time, onRetry }: { status: SaveStatus; time: string | null; onRetry: () => void }) {
  const t = useTranslations("adminForms.save");
  const tone =
    status === "saved"
      ? "text-green"
      : status === "retrying" || status === "invalid" || status === "conflict"
        ? "text-pink"
        : "text-muted-foreground";

  return (
    <span role="status" aria-live="polite" className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", tone)}>
      {status === "saved" && <CircleCheck className="h-3.5 w-3.5" aria-hidden />}
      {(status === "saving" || status === "pending") && (
        <LoaderCircle className={cn("h-3.5 w-3.5", status === "saving" && "animate-spin")} aria-hidden />
      )}
      {(status === "retrying" || status === "invalid" || status === "conflict") && (
        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
      )}
      {status === "saved" && (time ? t("savedAt", { time }) : t("saved"))}
      {status === "pending" && t("pending")}
      {status === "saving" && t("saving")}
      {status === "retrying" && t("retrying")}
      {status === "invalid" && t("invalid")}
      {status === "conflict" && t("conflictShort")}
      {(status === "retrying" || status === "invalid") && (
        <button type="button" onClick={onRetry} className="underline underline-offset-2 hover:no-underline">
          {t("retry")}
        </button>
      )}
    </span>
  );
}

export function BuilderHeader({
  publicUrl,
  responseCount,
  locale,
}: {
  publicUrl: string;
  responseCount: number;
  locale: string;
}) {
  const t = useTranslations("adminForms");
  const pathname = usePathname();
  const builder = useBuilder();
  const { form } = builder;
  const [previewOpen, setPreviewOpen] = useState(false);
  const base = `/admin/forms/${form.id}`;
  const onEditor = pathname.endsWith("/edit");
  const time = builder.savedAt
    ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(builder.savedAt)
    : null;

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link href="/admin/forms" className="text-xs font-bold text-blue hover:underline">
            ← {t("back")}
          </Link>
          <h1 className="mt-1 truncate text-2xl font-extrabold text-blue">{form.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 font-bold uppercase tracking-wide",
                statusClass[form.status],
              )}
            >
              {t(`status.${form.status}`)}
            </span>
            <span className="truncate">/{form.slug}</span>
            <span data-tour="builder.save"><SavePill status={builder.saveStatus} time={time} onRetry={builder.retryNow} /></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onEditor && (
            <div data-tour="builder.undo" className="flex items-center rounded-full border border-border bg-white">
              <button
                type="button"
                onClick={builder.undo}
                disabled={!builder.canUndo}
                title={`${t("undo")} (Ctrl+Z)`}
                aria-label={t("undo")}
                className="rounded-l-full px-3 py-2 text-grey hover:bg-muted disabled:opacity-30"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <span className="h-5 w-px bg-border" />
              <button
                type="button"
                onClick={builder.redo}
                disabled={!builder.canRedo}
                title={`${t("redo")} (Ctrl+Shift+Z)`}
                aria-label={t("redo")}
                className="rounded-r-full px-3 py-2 text-grey hover:bg-muted disabled:opacity-30"
              >
                <Redo2 className="h-4 w-4" />
              </button>
            </div>
          )}
          {onEditor ? (
            <button
              type="button"
              data-tour="builder.preview"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue"
            >
              <Eye className="h-3.5 w-3.5" />
              {t("preview.title")}
            </button>
          ) : (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {form.status === "published" ? t("view") : t("preview.title")}
            </a>
          )}
          <div data-tour="builder.publish">
            <PublishButton publicUrl={publicUrl} />
          </div>
        </div>
      </div>

      {builder.backup && (
        <div role="alert" className="mt-4 flex flex-col gap-3 rounded-card border border-blue/30 bg-blue/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-grey">{t("restore.title")}</p>
            <p className="text-muted-foreground">{t("restore.text")}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={builder.restoreBackup} className="rounded-full bg-blue px-4 py-2 text-xs font-bold text-white hover:opacity-90">
              {t("restore.restore")}
            </button>
            <button type="button" onClick={builder.discardBackup} className="rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:bg-muted">
              {t("restore.discard")}
            </button>
          </div>
        </div>
      )}

      {builder.conflict && (
        <div role="alert" className="mt-4 flex flex-col gap-3 rounded-card border border-pink/30 bg-pink/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-pink">{t("save.conflictTitle")}</p>
            <p className="text-muted-foreground">{t("save.conflictText")}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={builder.reloadFromServer} className="rounded-full bg-blue px-4 py-2 text-xs font-bold text-white hover:opacity-90">
              {t("save.conflictReload")}
            </button>
            <button type="button" onClick={builder.overwriteServer} className="rounded-full border border-pink bg-white px-4 py-2 text-xs font-bold text-pink hover:bg-pink/5">
              {t("save.conflictOverwrite")}
            </button>
          </div>
        </div>
      )}

      <PreviewDrawer open={previewOpen} onClose={() => setPreviewOpen(false)} publicUrl={publicUrl} />

      <nav data-tour="builder.tabs" aria-label={t("tabsLabel")} className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => {
          const href = `${base}/${tab}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={tab}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition",
                active ? "border-blue text-blue" : "border-transparent text-muted-foreground hover:text-grey",
              )}
            >
              {t(`tabs.${tab}`)}
              {tab === "results" && responseCount > 0 && (
                <span className="rounded-full bg-pink px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {responseCount}
                </span>
              )}
              <LinkPending />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
