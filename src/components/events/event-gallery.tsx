"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryImage = { src: string; alt: string; caption?: string; width?: number | null; height?: number | null };

const COLS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-3 lg:grid-cols-4",
};
const MASONRY: Record<number, string> = {
  2: "columns-2",
  3: "columns-2 lg:columns-3",
  4: "columns-2 sm:columns-3 lg:columns-4",
};

/**
 * Photo gallery (grid, masonry or swipeable carousel) with a full-screen lightbox:
 * arrow keys / buttons to navigate, Esc to close, focus returns to the clicked photo.
 */
export function EventGallery({
  images,
  layout = "grid",
  columns = 3,
}: {
  images: GalleryImage[];
  /** "feature": the first photo full width (e.g. a team photo), the others in a grid below. */
  layout?: "grid" | "masonry" | "carousel" | "feature";
  columns?: number;
}) {
  const t = useTranslations("eventPage");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const track = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  const show = useCallback((index: number) => setOpen(((index % images.length) + images.length) % images.length), [images.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  function close() {
    const index = open;
    setOpen(null);
    if (index !== null) triggers.current[index]?.focus();
  }

  const thumb = (image: GalleryImage, index: number, className: string, sizes: string, fill = true) => (
    <button
      type="button"
      ref={(element) => {
        triggers.current[index] = element;
      }}
      onClick={() => show(index)}
      aria-label={t("openPhoto", { n: index + 1 })}
      className={cn("group relative block w-full overflow-hidden rounded-[var(--form-card-radius,1rem)] bg-black/5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--event-primary,#2d74ba)]", className)}
    >
      {fill ? (
        <Image src={image.src} alt={image.alt} fill sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
      ) : (
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width || 1200}
          height={image.height || 800}
          sizes={sizes}
          className="h-auto w-full transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
      )}
    </button>
  );

  const current = open !== null ? images[open] : null;

  return (
    <>
      {layout === "carousel" ? (
        <div className="relative">
          <ul ref={track} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:thin]">
            {images.map((image, index) => (
              <li key={`${image.src}-${index}`} className="w-[85%] shrink-0 snap-center sm:w-[60%] lg:w-[45%]">
                {thumb(image, index, "aspect-[4/3]", "(min-width: 1024px) 45vw, 85vw")}
                {image.caption && <p className="mt-1.5 text-sm opacity-75">{image.caption}</p>}
              </li>
            ))}
          </ul>
          {images.length > 1 && (
            <div className="mt-2 flex justify-end gap-2">
              {[-1, 1].map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.8, behavior: "smooth" })}
                  aria-label={direction < 0 ? t("scrollPrev") : t("scrollNext")}
                  className="rounded-full border border-current/20 p-2 hover:bg-black/5"
                >
                  {direction < 0 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : layout === "feature" ? (
        <div className="space-y-3">
          {images[0] && (
            <figure>
              {thumb(images[0], 0, "", "(min-width: 1280px) 1152px, 100vw", false)}
              {images[0].caption && <figcaption className="mt-1.5 text-sm opacity-75">{images[0].caption}</figcaption>}
            </figure>
          )}
          {images.length > 1 && (
            <ul className={cn("grid grid-cols-2 gap-3", COLS[columns] ?? COLS[3])}>
              {images.slice(1).map((image, offset) => (
                <li key={`${image.src}-${offset + 1}`}>
                  {thumb(image, offset + 1, "aspect-[4/3]", "(min-width: 1024px) 33vw, 50vw")}
                  {image.caption && <p className="mt-1.5 text-sm opacity-75">{image.caption}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : layout === "masonry" ? (
        <ul className={cn("gap-3 [&>li]:mb-3", MASONRY[columns] ?? MASONRY[3])}>
          {images.map((image, index) => (
            <li key={`${image.src}-${index}`} className="break-inside-avoid">
              {thumb(image, index, "", "(min-width: 1024px) 33vw, 50vw", false)}
              {image.caption && <p className="mt-1.5 text-sm opacity-75">{image.caption}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <ul className={cn("grid grid-cols-2 gap-3", COLS[columns] ?? COLS[3])}>
          {images.map((image, index) => (
            <li key={`${image.src}-${index}`}>
              {thumb(image, index, "aspect-[4/3]", "(min-width: 1024px) 33vw, 50vw")}
              {image.caption && <p className="mt-1.5 text-sm opacity-75">{image.caption}</p>}
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => open !== null && close()}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" && open !== null) show(open + 1);
          if (event.key === "ArrowLeft" && open !== null) show(open - 1);
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        aria-label={current ? t("photoOf", { n: (open ?? 0) + 1, total: images.length }) : undefined}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
      >
        {current && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-3 text-sm">
              <span aria-live="polite">{t("photoOf", { n: (open ?? 0) + 1, total: images.length })}</span>
              <button type="button" onClick={close} aria-label={t("close")} className="rounded-full p-2 hover:bg-white/10">
                <X className="h-6 w-6" />
              </button>
            </div>
            <figure className="relative min-h-0 flex-1">
              <Image key={current.src} src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" />
            </figure>
            {current.caption && <p className="px-4 py-3 text-center text-sm text-white/85">{current.caption}</p>}
            {images.length > 1 && (
              <div className="flex justify-center gap-4 p-3">
                <button type="button" onClick={() => show((open ?? 0) - 1)} aria-label={t("prevPhoto")} className="rounded-full bg-white/10 p-3 hover:bg-white/20">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button type="button" onClick={() => show((open ?? 0) + 1)} aria-label={t("nextPhoto")} className="rounded-full bg-white/10 p-3 hover:bg-white/20">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
