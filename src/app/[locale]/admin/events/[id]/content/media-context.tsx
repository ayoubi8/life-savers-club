"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Film, Link2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { parseVideoUrl } from "@/lib/events/content";
import { IMAGE_TYPES, VIDEO_TYPES, uploadEventMedia } from "@/lib/events/upload";
import { uploadDepartmentMedia } from "@/lib/team/upload";
import { cn } from "@/lib/utils";

/** The page whose media library the editor uses. */
export type ContentTarget = { kind: "event" | "department"; id: string };

export type LibraryItem = { id: string; url: string; kind: "image" | "video"; alt: string; width: number | null; height: number | null };

export type PickResult =
  | { type: "media"; items: LibraryItem[] }
  | { type: "embed"; provider: string; src: string };

type PickRequest = { kind: "image" | "video"; multiple?: boolean; resolve: (result: PickResult | null) => void };

type MediaContextValue = {
  target: ContentTarget;
  library: LibraryItem[];
  /** Opens the picker; resolves with the chosen files (or a video link), or null when cancelled. */
  pick: (kind: "image" | "video", options?: { multiple?: boolean }) => Promise<PickResult | null>;
  /** Uploads files dropped or pasted into the editor. */
  uploadFiles: (files: File[]) => Promise<LibraryItem[]>;
};

const MediaContext = createContext<MediaContextValue | null>(null);

export function useEventMedia() {
  const value = useContext(MediaContext);
  if (!value) throw new Error("useEventMedia must be used inside <EventMediaProvider>");
  return value;
}

export function EventMediaProvider({ target, initial, children }: { target: ContentTarget; initial: LibraryItem[]; children: React.ReactNode }) {
  const t = useTranslations("adminEvents");
  const [library, setLibrary] = useState(initial);
  const [request, setRequest] = useState<PickRequest | null>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const added: LibraryItem[] = [];
      for (const file of files) {
        const toastId = toast.loading(t("media.uploading", { name: file.name }));
        const result = target.kind === "department" ? await uploadDepartmentMedia(target.id, file) : await uploadEventMedia(target.id, file);
        toast.dismiss(toastId);
        if (!result.ok) {
          toast.error(t(`media.errors.${result.error}`, { name: file.name }));
          continue;
        }
        added.push({ id: result.media.id, url: result.media.url, kind: result.media.kind, alt: "", width: result.media.width, height: result.media.height });
      }
      if (added.length) setLibrary((list) => [...list, ...added]);
      return added;
    },
    [target.kind, target.id, t],
  );

  const pick = useCallback(
    (kind: "image" | "video", options: { multiple?: boolean } = {}) =>
      new Promise<PickResult | null>((resolve) => setRequest({ kind, multiple: options.multiple, resolve })),
    [],
  );

  return (
    <MediaContext.Provider value={{ target, library, pick, uploadFiles }}>
      {children}
      {request && (
        <MediaPicker
          request={request}
          library={library}
          uploadFiles={uploadFiles}
          onDone={(result) => {
            request.resolve(result);
            setRequest(null);
          }}
        />
      )}
    </MediaContext.Provider>
  );
}

function MediaPicker({
  request,
  library,
  uploadFiles,
  onDone,
}: {
  request: PickRequest;
  library: LibraryItem[];
  uploadFiles: (files: File[]) => Promise<LibraryItem[]>;
  onDone: (result: PickResult | null) => void;
}) {
  const t = useTranslations("adminEvents.editor.picker");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const items = library.filter((item) => item.kind === request.kind);
  const parsed = link ? parseVideoUrl(link) : null;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function toggle(id: string) {
    if (!request.multiple) {
      const item = items.find((i) => i.id === id);
      if (item) onDone({ type: "media", items: [item] });
      return;
    }
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  async function upload(files: File[]) {
    setBusy(true);
    const added = await uploadFiles(files);
    setBusy(false);
    if (!added.length) return;
    if (request.multiple) setSelected((list) => [...list, ...added.map((item) => item.id)]);
    else onDone({ type: "media", items: [added[0]] });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onDone(null)}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-labelledby="picker-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-card border border-border bg-white p-0 shadow-soft backdrop:bg-black/40"
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="picker-title" className="text-lg font-extrabold text-blue">
            {request.kind === "image" ? (request.multiple ? t("titleGallery") : t("titleImage")) : t("titleVideo")}
          </h2>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label={t("close")} className="rounded-full p-1.5 text-grey hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {request.kind === "video" && (
          <div className="mt-4 rounded-xl border border-border p-3">
            <label className="block text-xs font-bold text-grey" htmlFor="video-link">
              <Link2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {t("videoLink")}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="video-link"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
              />
              <button
                type="button"
                disabled={!parsed}
                onClick={() => parsed && onDone({ type: "embed", provider: parsed.provider, src: parsed.embedUrl })}
                className="rounded-full bg-blue px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40"
              >
                {t("insert")}
              </button>
            </div>
            <p className={cn("mt-1 text-[11px]", link && !parsed ? "font-bold text-pink" : "text-muted-foreground")}>
              {link && !parsed ? t("videoInvalid") : t("videoHint")}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-grey">{t("library")}</p>
          <input
            ref={fileRef}
            type="file"
            multiple={request.multiple}
            accept={(request.kind === "image" ? IMAGE_TYPES : VIDEO_TYPES).join(",")}
            className="sr-only"
            aria-label={t("upload")}
            onChange={(event) => {
              void upload([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue disabled:opacity-60"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {busy ? t("uploading") : t("upload")}
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-3 rounded-xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => {
              const isSelected = selected.includes(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-pressed={request.multiple ? isSelected : undefined}
                    className={cn(
                      "relative block w-full overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-blue",
                      isSelected ? "border-pink" : "border-transparent hover:border-blue",
                    )}
                  >
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- library thumbnail
                      <img src={item.url} alt={item.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 bg-black text-xs text-white">
                        <Film className="h-6 w-6" aria-hidden />
                        {t("video")}
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-pink text-white">
                        <Check className="h-4 w-4" aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {request.multiple && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!selected.length}
              onClick={() => onDone({ type: "media", items: selected.map((id) => items.find((i) => i.id === id)!).filter(Boolean) })}
              className="rounded-full bg-blue px-5 py-2 text-sm font-extrabold text-white disabled:opacity-40"
            >
              {t("insertCount", { count: selected.length })}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
