"use client";

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useTranslations } from "next-intl";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleCheck,
  Columns2,
  Columns3,
  Film,
  HeartHandshake,
  ImagePlus,
  Info,
  Replace,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { safeHref } from "@/lib/events/content";
import { cn } from "@/lib/utils";
import { useEventMedia } from "./media-context";

/* Shared bits ---------------------------------------------------------------- */

const field = "w-full rounded-md border border-border bg-white px-2 py-1 text-xs text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";
const chip = (active: boolean) =>
  cn("rounded-md px-2 py-1 text-[11px] font-bold transition", active ? "bg-blue text-white" : "bg-white text-grey hover:bg-muted");

/** Settings bar shown above a selected block. Events inside never reach the editor. */
function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div contentEditable={false} className={cn("clear-both mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-blue/30 bg-blue/5 p-2 text-ink", className)}>
      {children}
    </div>
  );
}

function BlockActions({ editor, getPos, deleteNode }: Pick<NodeViewProps, "editor" | "getPos" | "deleteNode">) {
  const t = useTranslations("adminEvents.editor");
  const select = () => {
    const pos = getPos();
    if (typeof pos === "number") editor.chain().setNodeSelection(pos).run();
  };
  return (
    <span className="ml-auto flex gap-1">
      <button type="button" title={t("moveUp")} aria-label={t("moveUp")} onClick={() => { select(); editor.commands.moveBlock("up"); }} className="rounded-md bg-white p-1 text-grey hover:bg-muted">
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" title={t("moveDown")} aria-label={t("moveDown")} onClick={() => { select(); editor.commands.moveBlock("down"); }} className="rounded-md bg-white p-1 text-grey hover:bg-muted">
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button type="button" title={t("deleteBlock")} aria-label={t("deleteBlock")} onClick={deleteNode} className="rounded-md bg-white p-1 text-pink hover:bg-pink/10">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: React.ReactNode; title?: string }[]; onChange: (value: T) => void }) {
  return (
    <span role="group" aria-label={label} className="inline-flex items-center gap-0.5 rounded-lg bg-white p-0.5 ring-1 ring-border">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          aria-label={option.title}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={chip(value === option.value)}
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}

/* Image ------------------------------------------------------------------------ */

const WIDTH_CLASS: Record<string, string> = { "25": "sm:w-1/4", "33": "sm:w-1/3", "50": "sm:w-1/2", "75": "sm:w-3/4", "100": "w-full", full: "w-full" };
const FLOAT_CLASS: Record<string, string> = { left: "sm:float-left sm:mr-5", right: "sm:float-right sm:ml-5", center: "mx-auto" };

export function ImageView({ node, updateAttributes, selected, editor, getPos, deleteNode }: NodeViewProps) {
  const t = useTranslations("adminEvents.editor");
  const media = useEventMedia();
  const a = node.attrs as { src: string; alt: string; caption: string; width: string; align: string; rounded: boolean; shadow: boolean; border: boolean };

  async function replace() {
    const result = await media.pick("image");
    if (result?.type === "media") {
      const item = result.items[0];
      updateAttributes({ src: item.url, mediaId: item.id, alt: a.alt || item.alt });
    }
  }

  return (
    <NodeViewWrapper className="event-node">
      {selected && (
        <Panel>
          <Segmented
            label={t("image.width")}
            value={a.width}
            onChange={(width) => updateAttributes({ width })}
            options={["25", "33", "50", "75", "100"].map((w) => ({ value: w, label: `${w}%` })).concat({ value: "full", label: t("image.full") })}
          />
          <Segmented
            label={t("image.align")}
            value={a.align}
            onChange={(align) => updateAttributes({ align })}
            options={[
              { value: "left", label: <AlignLeft className="h-3.5 w-3.5" />, title: t("image.left") },
              { value: "center", label: <AlignCenter className="h-3.5 w-3.5" />, title: t("image.center") },
              { value: "right", label: <AlignRight className="h-3.5 w-3.5" />, title: t("image.right") },
            ]}
          />
          {(["rounded", "shadow", "border"] as const).map((key) => (
            <button key={key} type="button" aria-pressed={a[key]} onClick={() => updateAttributes({ [key]: !a[key] })} className={chip(a[key])}>
              {t(`image.${key}`)}
            </button>
          ))}
          <button type="button" onClick={replace} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-bold text-grey hover:bg-muted">
            <Replace className="h-3.5 w-3.5" aria-hidden />
            {t("image.replace")}
          </button>
          <BlockActions editor={editor} getPos={getPos} deleteNode={deleteNode} />
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-bold text-grey">
              {t("image.alt")}
              <input value={a.alt} maxLength={300} onChange={(e) => updateAttributes({ alt: e.target.value })} placeholder={t("image.altPlaceholder")} className={cn(field, !a.alt.trim() && "border-pink/60")} />
            </label>
            <label className="text-[11px] font-bold text-grey">
              {t("image.caption")}
              <input value={a.caption} maxLength={300} onChange={(e) => updateAttributes({ caption: e.target.value })} className={field} />
            </label>
          </div>
        </Panel>
      )}
      <figure contentEditable={false} className={cn("my-3", WIDTH_CLASS[a.width], a.width !== "full" && FLOAT_CLASS[a.align])}>
        {/* eslint-disable-next-line @next/next/no-img-element -- editor preview */}
        <img
          src={a.src}
          alt={a.alt}
          className={cn(
            "h-auto w-full",
            a.rounded && a.width !== "full" && "rounded-xl",
            a.shadow && "shadow-xl",
            a.border && "border-4 border-white ring-1 ring-black/10",
            selected && "outline-3 outline-offset-2 outline-blue",
          )}
        />
        {a.caption && <figcaption className="mt-1 text-center text-sm opacity-75">{a.caption}</figcaption>}
        {!a.alt.trim() && (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-pink">
            <TriangleAlert className="h-3 w-3" aria-hidden />
            {t("image.missingAlt")}
          </span>
        )}
      </figure>
    </NodeViewWrapper>
  );
}

/* Gallery ---------------------------------------------------------------------- */

type GalleryItem = { src: string; alt: string; caption: string; mediaId: string | null };

export function GalleryView({ node, updateAttributes, selected, editor, getPos, deleteNode }: NodeViewProps) {
  const t = useTranslations("adminEvents.editor");
  const media = useEventMedia();
  const a = node.attrs as { images: GalleryItem[]; layout: string; columns: number };
  const images = a.images ?? [];
  const setImages = (next: GalleryItem[]) => updateAttributes({ images: next });

  async function add() {
    const result = await media.pick("image", { multiple: true });
    if (result?.type === "media") {
      setImages([...images, ...result.items.map((item) => ({ src: item.url, alt: item.alt, caption: "", mediaId: item.id }))]);
    }
  }
  function move(index: number, delta: number) {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
  }

  return (
    <NodeViewWrapper className="event-node clear-both">
      {selected && (
        <Panel>
          <Segmented
            label={t("gallery.layout")}
            value={a.layout}
            onChange={(layout) => updateAttributes({ layout })}
            options={(["grid", "masonry", "carousel"] as const).map((value) => ({ value, label: t(`gallery.${value}`) }))}
          />
          <Segmented
            label={t("gallery.columns")}
            value={String(a.columns)}
            onChange={(columns) => updateAttributes({ columns: Number(columns) })}
            options={["2", "3", "4"].map((value) => ({ value, label: value }))}
          />
          <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-bold text-grey hover:bg-muted">
            <ImagePlus className="h-3.5 w-3.5" aria-hidden />
            {t("gallery.add")}
          </button>
          <BlockActions editor={editor} getPos={getPos} deleteNode={deleteNode} />
        </Panel>
      )}
      <ul contentEditable={false} className={cn("my-3 grid gap-2 rounded-xl p-1", a.columns === 2 ? "grid-cols-2" : a.columns === 4 ? "grid-cols-4" : "grid-cols-3", selected && "outline-3 outline-blue")}>
        {images.map((image, index) => (
          <li key={`${image.src}-${index}`} className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- editor preview */}
            <img src={image.src} alt={image.alt} className="aspect-[4/3] w-full rounded-lg object-cover" />
            {selected && (
              <div className="mt-1 space-y-1">
                <input value={image.alt} placeholder={t("image.alt")} aria-label={t("image.alt")} onChange={(e) => setImages(images.map((img, i) => (i === index ? { ...img, alt: e.target.value } : img)))} className={cn(field, !image.alt.trim() && "border-pink/60")} />
                <input value={image.caption ?? ""} placeholder={t("image.caption")} aria-label={t("image.caption")} onChange={(e) => setImages(images.map((img, i) => (i === index ? { ...img, caption: e.target.value } : img)))} className={field} />
                <div className="flex justify-between">
                  <span className="flex gap-1">
                    <button type="button" aria-label={t("moveLeft")} onClick={() => move(index, -1)} className="rounded p-1 text-grey hover:bg-muted"><ArrowLeft className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label={t("moveRight")} onClick={() => move(index, 1)} className="rounded p-1 text-grey hover:bg-muted"><ArrowRight className="h-3.5 w-3.5" /></button>
                  </span>
                  <button type="button" aria-label={t("gallery.remove")} onClick={() => setImages(images.filter((_, i) => i !== index))} className="rounded p-1 text-pink hover:bg-pink/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )}
          </li>
        ))}
        {images.length === 0 && (
          <li className="col-span-full">
            <button type="button" onClick={add} className="w-full rounded-lg border-2 border-dashed border-border py-8 text-sm font-bold text-grey hover:border-blue hover:text-blue">
              {t("gallery.add")}
            </button>
          </li>
        )}
      </ul>
    </NodeViewWrapper>
  );
}

/* Video ------------------------------------------------------------------------ */

export function VideoView({ node, updateAttributes, selected, editor, getPos, deleteNode }: NodeViewProps) {
  const t = useTranslations("adminEvents.editor");
  const media = useEventMedia();
  const a = node.attrs as { provider: string; src: string; title: string; caption: string; loop: boolean };
  const portrait = a.provider === "instagram" || a.provider === "tiktok";

  async function replace() {
    const result = await media.pick("video");
    if (result?.type === "embed") updateAttributes({ provider: result.provider, src: result.src, loop: false });
    if (result?.type === "media") updateAttributes({ provider: "file", src: result.items[0].url });
  }

  return (
    <NodeViewWrapper className="event-node clear-both">
      {selected && (
        <Panel>
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-bold capitalize text-grey">
            <Film className="h-3.5 w-3.5" aria-hidden />
            {a.provider === "file" ? t("video.file") : a.provider}
          </span>
          {a.provider === "file" && (
            <button type="button" aria-pressed={a.loop} onClick={() => updateAttributes({ loop: !a.loop })} className={chip(a.loop)}>
              {t("video.loop")}
            </button>
          )}
          <button type="button" onClick={replace} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-bold text-grey hover:bg-muted">
            <Replace className="h-3.5 w-3.5" aria-hidden />
            {t("video.replace")}
          </button>
          <BlockActions editor={editor} getPos={getPos} deleteNode={deleteNode} />
          <div className="grid w-full gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-bold text-grey">
              {t("video.title")}
              <input value={a.title} maxLength={200} onChange={(e) => updateAttributes({ title: e.target.value })} className={field} />
            </label>
            <label className="text-[11px] font-bold text-grey">
              {t("image.caption")}
              <input value={a.caption} maxLength={300} onChange={(e) => updateAttributes({ caption: e.target.value })} className={field} />
            </label>
          </div>
        </Panel>
      )}
      <div contentEditable={false} className={cn("relative my-3 overflow-hidden rounded-xl bg-black", portrait ? "mx-auto aspect-[9/16] max-w-xs" : "aspect-video", selected && "outline-3 outline-offset-2 outline-blue")}>
        {a.provider === "file" ? (
          <video src={a.src} preload="metadata" muted className="h-full w-full object-contain" />
        ) : (
          <iframe src={a.src} title={a.title || "video"} loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" className="pointer-events-none h-full w-full border-0" />
        )}
        {/* Clicking the preview selects the block instead of playing the video. */}
        <span aria-hidden className="absolute inset-0" />
      </div>
      {a.caption && <p className="-mt-1 mb-3 text-center text-sm opacity-75">{a.caption}</p>}
    </NodeViewWrapper>
  );
}

/* Callout ---------------------------------------------------------------------- */

const TONES = {
  info: { icon: Info, color: "#2d74ba" },
  heart: { icon: HeartHandshake, color: "#ef4a6c" },
  warning: { icon: TriangleAlert, color: "#d97706" },
  success: { icon: CircleCheck, color: "#3f8f1f" },
} as const;

export function CalloutView({ node, updateAttributes, editor, getPos, deleteNode, selected }: NodeViewProps) {
  const t = useTranslations("adminEvents.editor");
  const tone = TONES[node.attrs.tone as keyof typeof TONES] ?? TONES.info;
  const color = (node.attrs.color as string | null) ?? tone.color;
  const Icon = tone.icon;
  return (
    <NodeViewWrapper className="event-node clear-both">
      <div className="group relative my-3 flex gap-3 rounded-xl border-l-4 p-4" style={{ borderColor: color, backgroundColor: `${color}14` }}>
        <Icon className="mt-1 h-5 w-5 shrink-0" style={{ color }} aria-hidden />
        <NodeViewContent className="min-w-0 flex-1 [&_p]:my-1" />
        <div contentEditable={false} className={cn("absolute -top-3 right-2 flex gap-1 rounded-lg bg-white p-0.5 shadow ring-1 ring-border", selected ? "flex" : "hidden group-focus-within:flex group-hover:flex")}>
          {(Object.keys(TONES) as (keyof typeof TONES)[]).map((key) => {
            const ToneIcon = TONES[key].icon;
            return (
              <button key={key} type="button" title={t(`callout.${key}`)} aria-label={t(`callout.${key}`)} aria-pressed={node.attrs.tone === key} onClick={() => updateAttributes({ tone: key, color: null })} className={cn("rounded-md p-1", node.attrs.tone === key ? "bg-muted" : "hover:bg-muted")}>
                <ToneIcon className="h-3.5 w-3.5" style={{ color: TONES[key].color }} />
              </button>
            );
          })}
          <BlockActions editor={editor} getPos={getPos} deleteNode={deleteNode} />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

/* Columns ---------------------------------------------------------------------- */

export function ColumnsView({ node, editor, getPos, deleteNode }: NodeViewProps) {
  const t = useTranslations("adminEvents.editor");
  const count = node.childCount;

  function setCount(target: 2 | 3) {
    const pos = getPos();
    if (typeof pos !== "number" || target === count) return;
    const { schema } = editor.state;
    const end = pos + node.nodeSize - 1; // inside the columns node, after the last column
    if (target === 3) {
      editor.chain().insertContentAt(end, schema.nodes.column.create(null, schema.nodes.paragraph.create()).toJSON()).run();
      return;
    }
    // 3 → 2: move the last column's content to the end of the second column.
    const last = node.child(2);
    const secondEnd = pos + 1 + node.child(0).nodeSize + node.child(1).nodeSize - 1;
    editor
      .chain()
      .command(({ tr }) => {
        tr.delete(end - last.nodeSize, end);
        tr.insert(secondEnd, last.content);
        return true;
      })
      .run();
  }

  return (
    <NodeViewWrapper className="event-node clear-both">
      <div className="group relative my-3 rounded-xl border border-dashed border-border p-2">
        <div contentEditable={false} className="absolute -top-3 right-2 hidden gap-1 rounded-lg bg-white p-0.5 shadow ring-1 ring-border group-focus-within:flex group-hover:flex">
          <button type="button" title={t("columns.two")} aria-label={t("columns.two")} aria-pressed={count === 2} onClick={() => setCount(2)} className={cn("rounded-md p-1", count === 2 ? "bg-muted" : "hover:bg-muted")}>
            <Columns2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" title={t("columns.three")} aria-label={t("columns.three")} aria-pressed={count === 3} onClick={() => setCount(3)} className={cn("rounded-md p-1", count === 3 ? "bg-muted" : "hover:bg-muted")}>
            <Columns3 className="h-3.5 w-3.5" />
          </button>
          <BlockActions editor={editor} getPos={getPos} deleteNode={deleteNode} />
        </div>
        <NodeViewContent className={cn("event-columns grid gap-4", count === 3 ? "md:grid-cols-3" : "md:grid-cols-2")} />
      </div>
    </NodeViewWrapper>
  );
}

/* Button ----------------------------------------------------------------------- */

export function ButtonView({ node, updateAttributes, selected, editor, getPos, deleteNode }: NodeViewProps) {
  const t = useTranslations("adminEvents.editor");
  const a = node.attrs as { label: string; href: string; variant: string; align: string };
  const valid = Boolean(safeHref(a.href));
  return (
    <NodeViewWrapper className="event-node clear-both">
      {selected && (
        <Panel>
          <label className="text-[11px] font-bold text-grey">
            {t("button.label")}
            <input value={a.label} maxLength={80} onChange={(e) => updateAttributes({ label: e.target.value })} className={field} />
          </label>
          <label className="min-w-56 flex-1 text-[11px] font-bold text-grey">
            {t("button.href")}
            <input value={a.href} maxLength={500} placeholder="https://… ou /fr/f/adhesion" onChange={(e) => updateAttributes({ href: e.target.value })} className={cn(field, a.href && !valid && "border-pink")} />
          </label>
          <Segmented
            label={t("button.style")}
            value={a.variant}
            onChange={(variant) => updateAttributes({ variant })}
            options={(["primary", "accent", "outline"] as const).map((value) => ({ value, label: t(`button.${value}`) }))}
          />
          <Segmented
            label={t("image.align")}
            value={a.align}
            onChange={(align) => updateAttributes({ align })}
            options={[
              { value: "left", label: <AlignLeft className="h-3.5 w-3.5" />, title: t("image.left") },
              { value: "center", label: <AlignCenter className="h-3.5 w-3.5" />, title: t("image.center") },
              { value: "right", label: <AlignRight className="h-3.5 w-3.5" />, title: t("image.right") },
            ]}
          />
          <BlockActions editor={editor} getPos={getPos} deleteNode={deleteNode} />
        </Panel>
      )}
      <p contentEditable={false} className={cn("my-3", a.align === "center" && "text-center", a.align === "right" && "text-right")}>
        <span
          className={cn(
            "inline-flex rounded-full px-6 py-3 font-extrabold",
            a.variant === "outline" ? "border-2 border-blue text-blue" : "text-white",
            selected && "outline-3 outline-offset-2 outline-blue",
          )}
          style={a.variant === "outline" ? undefined : { background: a.variant === "accent" ? "var(--brand-pink)" : "var(--brand-blue)" }}
        >
          {a.label || t("button.placeholder")}
        </span>
        {(!a.label || !valid) && <span className="ml-2 text-[11px] font-bold text-pink">{t("button.incomplete")}</span>}
      </p>
    </NodeViewWrapper>
  );
}

/* Spacer ----------------------------------------------------------------------- */

export function SpacerView({ node, updateAttributes, selected, editor, getPos, deleteNode }: NodeViewProps) {
  const t = useTranslations("adminEvents.editor");
  const size = String(node.attrs.size);
  return (
    <NodeViewWrapper className="event-node clear-both">
      {selected && (
        <Panel>
          <Segmented
            label={t("spacer.size")}
            value={size}
            onChange={(value) => updateAttributes({ size: value })}
            options={(["sm", "md", "lg"] as const).map((value) => ({ value, label: t(`spacer.${value}`) }))}
          />
          <BlockActions editor={editor} getPos={getPos} deleteNode={deleteNode} />
        </Panel>
      )}
      <div
        contentEditable={false}
        className={cn("rounded-md border border-dashed border-border/80", size === "sm" ? "h-4" : size === "lg" ? "h-20" : "h-10", selected && "border-blue bg-blue/5")}
        title={t("spacer.title")}
      />
    </NodeViewWrapper>
  );
}
