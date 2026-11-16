"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Film, ImageUp, Star, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/ui/confirm";
import { deleteMedia, setEventCover, updateMediaAlt } from "@/lib/events/actions";
import { IMAGE_TYPES, VIDEO_TYPES, uploadEventMedia } from "@/lib/events/upload";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  url: string;
  kind: "image" | "video";
  alt: string;
  size: number | null;
  width: number | null;
  height: number | null;
};

type Upload = { name: string; progress: number };

/** The event's media library: upload many files at once, describe them, pick the cover, delete. */
export function MediaPanel({ eventId, coverUrl, media }: { eventId: string; coverUrl: string | null; media: Item[] }) {
  const t = useTranslations("adminEvents.media");
  const router = useRouter();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(media);
  const [cover, setCover] = useState(coverUrl);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();

  async function uploadAll(files: File[]) {
    if (!files.length) return;
    setUploads(files.map((file) => ({ name: file.name, progress: 0 })));
    let added = 0;
    // One at a time: phones on weak connections handle this better than parallel uploads.
    for (const [index, file] of files.entries()) {
      const result = await uploadEventMedia(eventId, file, {
        onProgress: (progress) => setUploads((list) => list.map((u, i) => (i === index ? { ...u, progress } : u))),
      });
      if (result.ok) {
        added += 1;
        setItems((list) => [
          ...list,
          { id: result.media.id, url: result.media.url, kind: result.media.kind, alt: "", size: null, width: result.media.width, height: result.media.height },
        ]);
      } else {
        toast.error(t(`errors.${result.error}`, { name: file.name }));
      }
      setUploads((list) => list.map((u, i) => (i === index ? { ...u, progress: 1 } : u)));
    }
    setUploads([]);
    if (added) {
      toast.success(t("uploaded", { count: added }));
      router.refresh();
    }
  }

  function saveAlt(item: Item, alt: string) {
    if (alt === item.alt) return;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, alt } : i)));
    startTransition(async () => {
      const result = await updateMediaAlt(item.id, alt);
      if (result.ok) toast.success(t("altSaved"));
    });
  }

  function makeCover(item: Item) {
    startTransition(async () => {
      const result = await setEventCover(eventId, item.id);
      if (!result.ok) return void toast.error(t("errors.failed", { name: "" }));
      setCover(item.url);
      toast.success(t("coverSet"));
      router.refresh();
    });
  }

  async function remove(item: Item) {
    const ok = await confirm({ title: t("deleteConfirm"), message: t("deleteText"), confirmLabel: t("delete"), danger: true });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteMedia(item.id);
      if (!result.ok) return void toast.error(t("errors.failed", { name: "" }));
      setItems((list) => list.filter((i) => i.id !== item.id));
      if (cover === item.url) setCover(null);
      toast.success(t("deleted"));
      router.refresh();
    });
  }

  const busy = uploads.length > 0;

  return (
    <div className="space-y-4">
      <section
        className={cn(
          "rounded-card border-2 border-dashed bg-white p-6 text-center transition",
          dragging ? "border-blue bg-blue/5" : "border-border",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) void uploadAll([...event.dataTransfer.files]);
        }}
        aria-labelledby="media-title"
      >
        <h2 id="media-title" className="sr-only">{t("title")}</h2>
        <ImageUp className="mx-auto h-9 w-9 text-blue" aria-hidden />
        <p className="mt-2 font-extrabold text-ink">{t("drop")}</p>
        <p className="text-xs text-muted-foreground">{t("or")}</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
          className="sr-only"
          aria-label={t("pick")}
          onChange={(event) => {
            void uploadAll([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="mt-2 rounded-full bg-blue px-5 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-60"
        >
          {t("pick")}
        </button>
        <p className="mx-auto mt-3 max-w-lg text-xs text-muted-foreground">{t("hint")}</p>

        {busy && (
          <ul className="mx-auto mt-4 max-w-md space-y-2 text-left" aria-live="polite">
            {uploads.map((upload, index) => (
              <li key={index}>
                <p className="truncate text-xs font-semibold text-grey">{t("uploading", { name: upload.name })}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-blue transition-[width]" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {items.length === 0 ? (
        <p className="rounded-card border border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isCover = item.url === cover;
            return (
              <li key={item.id} className={cn("overflow-hidden rounded-card border bg-white", isCover ? "border-pink ring-2 ring-pink/20" : "border-border")}>
                <div className="relative aspect-[4/3] bg-muted">
                  {item.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- library thumbnail
                    <img src={item.url} alt={item.alt} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <video src={item.url} preload="metadata" muted controls className="h-full w-full bg-black object-contain" />
                  )}
                  {isCover && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-pink px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      <Star className="h-3 w-3" fill="currentColor" aria-hidden />
                      {t("isCover")}
                    </span>
                  )}
                  {item.kind === "video" && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      <Film className="h-3 w-3" aria-hidden />
                      {t("video")}
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <label className="block text-[11px] font-bold text-grey">
                    {t("alt")}
                    <input
                      defaultValue={item.alt}
                      maxLength={300}
                      placeholder={t("altPlaceholder")}
                      onBlur={(event) => saveAlt(item, event.target.value.trim())}
                      className={cn(
                        "mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs font-normal outline-none focus:border-blue focus:ring-2 focus:ring-blue/20",
                        item.alt ? "border-border" : "border-pink/50",
                      )}
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[11px] text-muted-foreground">
                      {!item.alt && (
                        <span className="mr-2 inline-flex items-center gap-1 font-bold text-pink">
                          <TriangleAlert className="h-3 w-3" aria-hidden />
                          {t("missingAlt")}
                        </span>
                      )}
                      {item.width && item.height ? `${item.width}×${item.height}` : ""}
                      {item.size ? ` · ${t("size", { size: (item.size / 1024 / 1024).toFixed(1) })}` : ""}
                    </span>
                    <span className="flex gap-1">
                      {item.kind === "image" && !isCover && (
                        <button
                          type="button"
                          onClick={() => makeCover(item)}
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold text-blue hover:bg-blue/10"
                        >
                          {t("setCover")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        aria-label={t("delete")}
                        title={t("delete")}
                        className="rounded-full p-1.5 text-pink hover:bg-pink/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
