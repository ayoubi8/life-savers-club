"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, Film, Pencil, Trash2, X } from "lucide-react";
import type { AssetItem } from "@/lib/media/queries";
import { formatBytes, formatDuration, isPreviewable, ORIENTATIONS, RESOLUTION_LABELS, resolutionOf, type Orientation } from "@/lib/media/schema";

export const fileUrl = (id: string, download = false) => `/api/media/${id}/file${download ? "?download=1" : ""}`;

/** Full-screen preview with previous/next and the file's actions. */
export function Lightbox({
  item,
  hasPrevious,
  hasNext,
  folders,
  onPrevious,
  onNext,
  onClose,
  onRename,
  onMove,
  onOrientation,
  onDelete,
}: {
  item: AssetItem;
  hasPrevious: boolean;
  hasNext: boolean;
  folders: { id: string; name: string }[];
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onRename: () => void;
  onMove: (folderId: string) => void;
  onOrientation: (orientation: Orientation | null) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("adminMedia");
  const locale = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const failed = failedId === item.id;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA", "VIDEO"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft" && hasPrevious) onPrevious();
      if (event.key === "ArrowRight" && hasNext) onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrevious, hasNext, onPrevious, onNext]);

  const previewable = isPreviewable(item.mime_type) && !failed;
  const details = [
    formatBytes(item.size_bytes, locale),
    item.width && item.height ? `${item.width} × ${item.height}` : null,
    item.kind === "video" ? formatDuration(item.duration_s) : null,
    item.kind === "video" && resolutionOf(item.width, item.height) ? RESOLUTION_LABELS[resolutionOf(item.width, item.height)!] : null,
    new Date(item.created_at).toLocaleDateString(locale),
  ].filter(Boolean);

  const control = "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20";

  return (
    <dialog
      ref={ref}
      aria-label={item.name}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold">{item.name}</h2>
            <p className="truncate text-xs text-white/70">{details.join(" · ")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-full p-2 hover:bg-white/10">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
          {previewable ? (
            item.kind === "video" ? (
              <video
                key={item.id}
                src={fileUrl(item.id)}
                poster={item.thumbUrl ?? undefined}
                controls
                autoPlay
                playsInline
                preload="metadata"
                onError={() => setFailedId(item.id)}
                className="max-h-full max-w-full rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- private file streamed by our API
              <img key={item.id} src={fileUrl(item.id)} alt={item.name} onError={() => setFailedId(item.id)} className="max-h-full max-w-full rounded-lg object-contain" />
            )
          ) : (
            <div className="max-w-sm text-center">
              {item.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed, private thumbnail
                <img src={item.thumbUrl} alt="" className="mx-auto max-h-64 rounded-lg" />
              ) : (
                <Film className="mx-auto h-12 w-12 text-white/40" aria-hidden />
              )}
              <p className="mt-4 text-sm text-white/80">{item.kind === "video" ? t("videoError") : t("noPreview")}</p>
            </div>
          )}

          {hasPrevious && (
            <button type="button" onClick={onPrevious} aria-label={t("previous")} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70">
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
          )}
          {hasNext && (
            <button type="button" onClick={onNext} aria-label={t("next")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70">
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-2 px-4 py-3">
          <a href={fileUrl(item.id, true)} className={control}>
            <Download className="h-4 w-4" aria-hidden />
            {t("download")}
          </a>
          <button type="button" onClick={onRename} className={control}>
            <Pencil className="h-4 w-4" aria-hidden />
            {t("rename")}
          </button>
          <label className="sr-only" htmlFor="lightbox-orientation">{t("orientation")}</label>
          <select
            id="lightbox-orientation"
            value={item.orientation ?? ""}
            onChange={(event) => onOrientation((event.target.value || null) as Orientation | null)}
            className="rounded-full border-0 bg-white/10 px-3 py-2 text-sm font-bold text-white [&>option]:text-ink"
          >
            <option value="">{t("orientation")}: {t("unknown")}</option>
            {ORIENTATIONS.map((value) => (
              <option key={value} value={value}>
                {t("orientation")}: {t(`filters.${value}`)}
              </option>
            ))}
          </select>
          {folders.length > 0 && (
            <>
              <label className="sr-only" htmlFor="lightbox-move">{t("moveTo")}</label>
              <select
                id="lightbox-move"
                value=""
                onChange={(event) => event.target.value && onMove(event.target.value)}
                className="rounded-full border-0 bg-white/10 px-3 py-2 text-sm font-bold text-white [&>option]:text-ink"
              >
                <option value="">{t("moveTo")}</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-full bg-pink px-3 py-2 text-sm font-bold text-white hover:opacity-90">
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("delete")}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
