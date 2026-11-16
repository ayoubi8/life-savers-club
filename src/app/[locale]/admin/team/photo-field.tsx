"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CoverFocus } from "@/lib/events/types";
import { uploadTeamPhoto, type PhotoFolder } from "@/lib/team/upload";
import { initials } from "@/lib/team/utils";
import { cn } from "@/lib/utils";

/**
 * Portrait: upload (compressed), then click the photo to choose the point kept in the
 * round crop. Arrow keys move the point too (Shift = bigger steps).
 */
export function PhotoField({
  folder,
  name,
  url,
  focus,
  onChange,
  compact = false,
}: {
  folder: PhotoFolder;
  name: string;
  url: string | null;
  focus: CoverFocus;
  onChange: (patch: { url?: string | null; focus?: CoverFocus }) => void;
  compact?: boolean;
}) {
  const t = useTranslations("adminTeam.photo");
  const tMedia = useTranslations("adminEvents.media");
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function upload(file: File) {
    setProgress(0);
    const result = await uploadTeamPhoto(folder, file, setProgress);
    setProgress(null);
    if (!result.ok) return void toast.error(tMedia(`errors.${result.error}`, { name: file.name }));
    onChange({ url: result.url, focus: { x: 50, y: 50 } });
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
    <div className={cn("flex gap-4", compact ? "items-center" : "flex-col sm:flex-row sm:items-start")}>
      {/* Round crop preview, as on the site. */}
      <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-muted shadow ring-2 ring-border", compact ? "h-16 w-16" : "h-28 w-28")}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an upload
          <img src={url} alt="" className="h-full w-full object-cover" style={{ objectPosition: position }} />
        ) : (
          <span aria-hidden className={cn("font-extrabold text-grey", compact ? "text-lg" : "text-3xl")}>
            {initials(name)}
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        {url && !compact && (
          <div className="mb-3">
            <button
              type="button"
              onClick={pickFocus}
              onKeyDown={nudgeFocus}
              aria-label={`${t("focus")} (${focus.x}%, ${focus.y}%)`}
              className="relative block cursor-crosshair overflow-hidden rounded-lg border border-border focus-visible:outline-3 focus-visible:outline-blue"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an upload */}
              <img src={url} alt="" className="block h-auto max-h-48 w-auto max-w-full" />
              <span
                aria-hidden
                className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-pink/80 shadow"
                style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
              />
            </button>
            <p className="mt-1 text-[11px] text-muted-foreground">{t("focusHint")}</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="sr-only"
          aria-label={t("upload")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={progress !== null}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4" aria-hidden />
            {progress !== null ? `${Math.round(progress * 100)} %` : url ? t("replace") : t("upload")}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => onChange({ url: null })}
              aria-label={t("remove")}
              title={t("remove")}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-pink hover:bg-pink/5"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {!compact && t("remove")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
