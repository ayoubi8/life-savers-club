"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ExternalLink, FileDown, Trash, UserCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { answerToText, type FormField } from "@/lib/forms/schema";
import {
  acceptAndCreateMember,
  saveResponseNote,
  setResponseStatus,
  signResponseFile,
} from "@/lib/forms/response-actions";
import { RESPONSE_STATUSES, type ResponseRow, type ResponseStatus } from "@/lib/forms/responses-query";
import { StatusChip } from "./status-chip";

export function ResponseDrawer({
  formId,
  locale,
  row,
  fields,
  position,
  onClose,
  onNavigate,
  onDelete,
  onChanged,
}: {
  formId: string;
  locale: string;
  row: ResponseRow;
  fields: FormField[];
  /** Index/count within the visible page, for previous/next. */
  position: { index: number; count: number; prevId: string | null; nextId: string | null } | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onDelete: (ids: string[]) => void;
  onChanged: () => void;
}) {
  const t = useTranslations("adminForms.results");
  const [note, setNote] = useState(row.review_note ?? "");
  const [pending, startTransition] = useTransition();
  const dateFormat = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  // Opening a new response marks it as seen.
  useEffect(() => {
    if (row.status === "new") {
      void setResponseStatus([row.id], "reviewed").then(onChanged);
    }
  }, [row.id, row.status, onChanged]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && position?.prevId) onNavigate(position.prevId);
      if (event.key === "ArrowRight" && position?.nextId) onNavigate(position.nextId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNavigate, position]);

  function changeStatus(status: ResponseStatus) {
    startTransition(async () => {
      const result = await setResponseStatus([row.id], status, note);
      if (result.ok) onChanged();
      else toast.error(t("failed"));
    });
  }

  function accept() {
    startTransition(async () => {
      const result = await acceptAndCreateMember(row.id);
      if (result.ok) {
        toast.success(result.memberCreated ? t("drawer.memberCreated") : t("drawer.accepted"));
        onChanged();
      } else {
        toast.error(t("failed"));
      }
    });
  }

  async function openFile(path: string) {
    const { url } = await signResponseFile(formId, path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error(t("drawer.fileFailed"));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("drawer.title")}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-soft"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-extrabold text-grey">{row.respondent_name || row.respondent_email || t("drawer.title")}</h2>
            <p className="text-xs text-muted-foreground">{dateFormat.format(new Date(row.created_at))}</p>
          </div>
          <div className="flex items-center gap-1">
            {position && (
              <>
                <button
                  type="button"
                  disabled={!position.prevId}
                  onClick={() => position.prevId && onNavigate(position.prevId)}
                  aria-label={t("drawer.prev")}
                  className="rounded-full p-2 text-grey hover:bg-muted disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {position.index + 1}/{position.count}
                </span>
                <button
                  type="button"
                  disabled={!position.nextId}
                  onClick={() => position.nextId && onNavigate(position.nextId)}
                  aria-label={t("drawer.next")}
                  className="rounded-full p-2 text-grey hover:bg-muted disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <button type="button" onClick={onClose} aria-label={t("drawer.close")} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={row.status} />
            {row.respondent_email && (
              <a href={`mailto:${row.respondent_email}`} className="text-xs font-semibold text-blue hover:underline">
                {row.respondent_email}
              </a>
            )}
          </div>

          <dl className="space-y-4">
            {fields.map((field) => {
              const raw = row.answers[field.id];
              const file =
                raw && typeof raw === "object" && !Array.isArray(raw)
                  ? (raw as { path?: string; name?: string })
                  : null;
              const text = answerToText(raw, field);
              return (
                <div key={field.id}>
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{field.label || field.type}</dt>
                  <dd className="mt-1 text-sm text-grey">
                    {file?.path ? (
                      <button
                        type="button"
                        onClick={() => openFile(file.path!)}
                        className="inline-flex items-center gap-1.5 font-semibold text-blue hover:underline"
                      >
                        <FileDown className="h-4 w-4" />
                        {file.name || t("drawer.file")}
                      </button>
                    ) : text ? (
                      <span className="whitespace-pre-line">{text}</span>
                    ) : (
                      <span className="text-muted-foreground">{t("drawer.noAnswer")}</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          <section className="rounded-card border border-border bg-muted/50 p-4">
            <h3 className="text-sm font-bold text-grey">{t("drawer.review")}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RESPONSE_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={pending}
                  aria-pressed={row.status === status}
                  onClick={() => changeStatus(status)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                    row.status === status
                      ? "border-blue bg-blue text-white"
                      : "border-border bg-white text-grey hover:border-blue",
                  )}
                >
                  {t(`status.${status}`)}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-xs font-bold text-grey">
              {t("drawer.note")}
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onBlur={() => {
                  if ((row.review_note ?? "") !== note) {
                    startTransition(async () => {
                      const result = await saveResponseNote(row.id, note);
                      if (result.ok) toast.success(t("drawer.noteSaved"));
                      else toast.error(t("failed"));
                    });
                  }
                }}
                rows={3}
                maxLength={2000}
                placeholder={t("drawer.notePlaceholder")}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
              />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={accept}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-green px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              <UserCheck className="h-4 w-4" />
              {t("drawer.acceptMember")}
            </button>
            <p className="mt-1 text-[11px] text-muted-foreground">{t("drawer.acceptHint")}</p>
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-border px-4 py-3">
          <a
            href={`mailto:${row.respondent_email ?? ""}`}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-bold text-blue hover:underline",
              !row.respondent_email && "pointer-events-none opacity-40",
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("drawer.reply")}
          </a>
          <button
            type="button"
            onClick={() => onDelete([row.id])}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-pink hover:bg-pink/10"
          >
            <Trash className="h-4 w-4" />
            {t("delete")}
          </button>
        </footer>
      </aside>
    </div>
  );
}
