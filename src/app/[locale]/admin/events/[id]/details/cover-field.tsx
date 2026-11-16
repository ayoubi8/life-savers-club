"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Crosshair, ImagePlus, Images, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadEventMedia } from "@/lib/events/upload";
import type { CoverFocus } from "@/lib/events/types";
import { cn } from "@/lib/utils";

const input =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

export type LibraryImage = { id: string; url: string; alt: string };

/**
 * Cover photo: upload (compressed) or pick from the event's library, describe it,
 * and click the photo to set the focal point. Two previews show how the card (16:10)
 * and the page header (21:9) will crop it.
 */
export function CoverField({
  eventId,
  url,
  alt,
  focus,
  library,
  onChange,
  onUploaded,
}: {
  eventId: string;
  url: string | null;
  alt: string;
  focus: CoverFocus;
  library: LibraryImage[];
  onChange: (patch: { url?: string | null; alt?: string; focus?: CoverFocus }) => void;
  onUploaded: (image: LibraryImage) => void;
}) {
  const t = useTranslations("adminEvents");
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (libraryOpen && !dialog.open) dialog.showModal();
    if (!libraryOpen && dialog.open) dialog.close();
  }, [libraryOpen]);

  async function upload(file: File) {
    setProgress(0);
    const result = await uploadEventMedia(eventId, file, { alt, onProgress: setProgress });
    setProgress(null);
    if (!result.ok) {
      toast.error(t(`media.errors.${result.error}`, { name: file.name }));
      return;
    }
    onUploaded({ id: result.media.id, url: result.media.url, alt });
    onChange({ url: result.media.url, focus: { x: 50, y: 50 } });
  }

  function pickFocus(event: React.MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    onChange({
      focus: {
        x: Math.round(((event.clientX - box.left) / box.width) * 100),
        y: Math.round(((event.clientY - box.top) / box.height) * 100),
      },
    });
  }

  function nudgeFocus(event: React.KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const clamp = (value: number) => Math.min(100, Math.max(0, value));
    onChange({ focus: { x: clamp(focus.x + move[0]), y: clamp(focus.y + move[1]) } });
  }

  const position = `${focus.x}% ${focus.y}%`;

  return (
    <div>
      <p className="text-sm font-bold text-grey">{t("details.cover")}</p>
      <p className="text-xs text-muted-foreground">{t("details.coverHint")}</p>

      {url ? (
        <div className="mt-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div>
            {/* The button hugs the image exactly, so click coordinates are image percentages. */}
            <div className="grid place-items-center rounded-xl border border-border bg-muted p-2">
            <button
              type="button"
              onClick={pickFocus}
              onKeyDown={nudgeFocus}
              aria-label={`${t("details.focus")} (${focus.x}%, ${focus.y}%)`}
              className="relative block cursor-crosshair overflow-hidden rounded-lg focus-visible:outline-3 focus-visible:outline-blue"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an upload */}
              <img src={url} alt="" className="block h-auto max-h-96 w-auto max-w-full" />
              <span
                aria-hidden
                className="pointer-events-none absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-pink/80 text-white shadow-lg"
                style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
              >
                <Crosshair className="h-4 w-4" />
              </span>
            </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{t("details.focusHint")}</p>
          </div>
          <div className="space-y-3">
            <figure>
              <figcaption className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("details.focusCard")}</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element -- crop preview */}
              <img src={url} alt="" className="aspect-[16/10] w-full rounded-lg border border-border object-cover" style={{ objectPosition: position }} />
            </figure>
            <figure>
              <figcaption className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("details.focusHero")}</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element -- crop preview */}
              <img src={url} alt="" className="aspect-[21/9] w-full rounded-lg border border-border object-cover" style={{ objectPosition: position }} />
            </figure>
          </div>
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        aria-label={t("details.upload")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={progress !== null}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          {progress !== null ? `${Math.round(progress * 100)} %` : t("details.upload")}
        </button>
        {library.length > 0 && (
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue"
          >
            <Images className="h-4 w-4" aria-hidden />
            {t("details.chooseLibrary")}
          </button>
        )}
        {url && (
          <button
            type="button"
            onClick={() => onChange({ url: null })}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-pink hover:bg-pink/5"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("details.removeCover")}
          </button>
        )}
      </div>
      {progress !== null && (
        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-blue transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      <label className="mt-4 block text-xs font-bold text-grey">
        {t("details.coverAlt")}
        <input
          value={alt}
          onChange={(event) => onChange({ alt: event.target.value })}
          maxLength={200}
          placeholder={t("details.coverAltPlaceholder")}
          className={cn(input, url && !alt.trim() && "border-pink/60")}
        />
        <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("details.coverAltHint")}</span>
      </label>

      <dialog
        ref={dialogRef}
        onClose={() => setLibraryOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setLibraryOpen(false);
        }}
        aria-labelledby="library-title"
        className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-card border border-border bg-white p-0 shadow-soft backdrop:bg-black/40"
      >
        {libraryOpen && (
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="library-title" className="text-lg font-extrabold text-blue">{t("media.libraryTitle")}</h2>
              <button type="button" onClick={() => setLibraryOpen(false)} aria-label={t("media.close")} className="rounded-full p-1.5 text-grey hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {library.map((image) => (
                <li key={image.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ url: image.url, alt: image.alt || alt, focus: { x: 50, y: 50 } });
                      setLibraryOpen(false);
                    }}
                    className={cn(
                      "block w-full overflow-hidden rounded-lg border-2 hover:border-blue focus-visible:outline-2 focus-visible:outline-blue",
                      image.url === url ? "border-pink" : "border-transparent",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnail */}
                    <img src={image.url} alt={image.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </dialog>
    </div>
  );
}
