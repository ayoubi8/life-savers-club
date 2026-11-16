import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { CircleCheck, HeartHandshake, Info, TriangleAlert } from "lucide-react";
import { sanitizeDoc, type EventDoc, type EventNode } from "@/lib/events/content";
import { cn } from "@/lib/utils";
import { EventGallery, type GalleryImage } from "./event-gallery";

/**
 * Renders an event page document. The document is sanitized again here, then each
 * allowed node maps to a React element: no HTML string is ever injected, links and
 * media URLs were validated by `sanitizeDoc`.
 */

type Dimensions = Record<string, { width: number | null; height: number | null }>;
type Ctx = { dims: Dimensions };

const FONT_SIZE: Record<string, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
};
const ALIGN: Record<string, string> = { center: "text-center", right: "text-right", justify: "text-justify" };

// Floated images wrap text on tablets and up; on phones they take the full width.
const IMAGE_LAYOUT: Record<string, Record<string, string>> = {
  left: { base: "sm:float-left sm:mr-6 sm:mb-3 sm:mt-1" },
  right: { base: "sm:float-right sm:ml-6 sm:mb-3 sm:mt-1" },
  center: { base: "mx-auto" },
};
const IMAGE_WIDTH: Record<string, string> = {
  "25": "sm:w-1/4",
  "33": "sm:w-1/3",
  "50": "sm:w-1/2",
  "75": "sm:w-3/4",
  "100": "w-full",
  full: "w-full",
};
const IMAGE_SIZES: Record<string, string> = {
  "25": "(min-width: 640px) 200px, 100vw",
  "33": "(min-width: 640px) 260px, 100vw",
  "50": "(min-width: 640px) 400px, 100vw",
  "75": "(min-width: 640px) 600px, 100vw",
  "100": "(min-width: 896px) 800px, 100vw",
  full: "100vw",
};

const CALLOUT = {
  info: { icon: Info, color: "#2d74ba" },
  heart: { icon: HeartHandshake, color: "#ef4a6c" },
  warning: { icon: TriangleAlert, color: "#d97706" },
  success: { icon: CircleCheck, color: "#3f8f1f" },
} as const;

const SPACER: Record<string, string> = { sm: "h-4", md: "h-10", lg: "h-20" };

function renderText(node: EventNode, key: number): ReactNode {
  let element: ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    const attrs = mark.attrs ?? {};
    switch (mark.type) {
      case "bold":
        element = <strong className="font-extrabold">{element}</strong>;
        break;
      case "italic":
        element = <em>{element}</em>;
        break;
      case "underline":
        element = <u>{element}</u>;
        break;
      case "strike":
        element = <s>{element}</s>;
        break;
      case "highlight":
        element = (
          <mark style={{ backgroundColor: String(attrs.color) }} className="rounded px-0.5 text-inherit">
            {element}
          </mark>
        );
        break;
      case "textStyle":
        element = (
          <span
            className={attrs.fontSize ? FONT_SIZE[String(attrs.fontSize)] : undefined}
            style={attrs.color ? { color: String(attrs.color) } : undefined}
          >
            {element}
          </span>
        );
        break;
      case "link": {
        const href = String(attrs.href);
        const external = !href.startsWith("/");
        element = (
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
            className="font-bold text-[var(--event-link)] underline decoration-2 underline-offset-2 hover:opacity-80"
          >
            {element}
          </a>
        );
        break;
      }
    }
  }
  return <span key={key}>{element}</span>;
}

function inline(node: EventNode) {
  return node.content?.map((child, index) => (child.type === "hardBreak" ? <br key={index} /> : renderText(child, index)));
}

function blocks(nodes: EventNode[] | undefined, ctx: Ctx) {
  return nodes?.map((node, index) => renderNode(node, index, ctx));
}

function EmbedVideo({ attrs }: { attrs: Record<string, unknown> }) {
  const provider = String(attrs.provider);
  const portrait = provider === "instagram" || provider === "tiktok";
  const title = String(attrs.title || attrs.caption || "Video");
  return (
    <figure className="my-6">
      {provider === "file" ? (
        <video
          src={String(attrs.src)}
          poster={attrs.poster ? String(attrs.poster) : undefined}
          controls
          preload="metadata"
          playsInline
          {...(attrs.loop ? { autoPlay: true, muted: true, loop: true } : {})}
          className="w-full rounded-[var(--form-card-radius,1rem)] bg-black"
          aria-label={title}
        />
      ) : (
        <div className={cn("overflow-hidden rounded-[var(--form-card-radius,1rem)] bg-black", portrait ? "mx-auto aspect-[9/16] max-w-sm" : "aspect-video")}>
          <iframe
            src={String(attrs.src)}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            className="h-full w-full border-0"
          />
        </div>
      )}
      {attrs.caption ? <figcaption className="mt-2 text-center text-sm opacity-75">{String(attrs.caption)}</figcaption> : null}
    </figure>
  );
}

function renderNode(node: EventNode, key: number, ctx: Ctx): ReactNode {
  const attrs = node.attrs ?? {};
  const align = ALIGN[String(attrs.textAlign)] ?? "";
  switch (node.type) {
    case "paragraph":
      return node.content?.length ? (
        <p key={key} className={cn("my-4 leading-relaxed", align)}>
          {inline(node)}
        </p>
      ) : (
        <div key={key} className="h-4" aria-hidden />
      );
    case "heading": {
      const level = Number(attrs.level);
      const className = cn(
        "clear-both font-extrabold leading-tight",
        level === 2 && "mt-10 mb-4 text-2xl sm:text-3xl",
        level === 3 && "mt-8 mb-3 text-xl sm:text-2xl",
        level === 4 && "mt-6 mb-2 text-lg",
        align,
      );
      return level === 2 ? (
        <h2 key={key} className={className}>{inline(node)}</h2>
      ) : level === 3 ? (
        <h3 key={key} className={className}>{inline(node)}</h3>
      ) : (
        <h4 key={key} className={className}>{inline(node)}</h4>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="my-4 list-disc space-y-1.5 pl-6 marker:text-[var(--event-accent)]">
          {blocks(node.content, ctx)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} start={Number(attrs.start) || 1} className="my-4 list-decimal space-y-1.5 pl-6 marker:font-bold marker:text-[var(--event-primary)]">
          {blocks(node.content, ctx)}
        </ol>
      );
    case "listItem":
      return <li key={key} className="pl-1 [&>p]:my-0">{blocks(node.content, ctx)}</li>;
    case "blockquote":
      return (
        <blockquote key={key} className="my-6 border-l-4 border-[var(--event-accent)] pl-5 text-lg italic opacity-90">
          {blocks(node.content, ctx)}
        </blockquote>
      );
    case "horizontalRule":
      return <hr key={key} className="clear-both my-10 border-t-2 border-current opacity-15" />;
    case "image": {
      const src = String(attrs.src);
      const width = String(attrs.width);
      const dims = ctx.dims[src];
      const full = width === "full";
      return (
        <figure
          key={key}
          className={cn(
            "my-6",
            full ? "relative left-1/2 w-screen max-w-none -translate-x-1/2" : cn(IMAGE_WIDTH[width], IMAGE_LAYOUT[String(attrs.align)]?.base),
          )}
        >
          <Image
            src={src}
            alt={String(attrs.alt ?? "")}
            width={dims?.width || 1600}
            height={dims?.height || 1067}
            sizes={IMAGE_SIZES[width]}
            className={cn(
              "h-auto w-full",
              !full && attrs.rounded === true && "rounded-[var(--form-card-radius,1rem)]",
              attrs.shadow === true && "shadow-xl",
              attrs.border === true && "border-4 border-white ring-1 ring-black/10",
            )}
          />
          {attrs.caption ? <figcaption className="mt-2 text-center text-sm opacity-75">{String(attrs.caption)}</figcaption> : null}
        </figure>
      );
    }
    case "gallery": {
      const images = (attrs.images as GalleryImage[]).map((image) => ({ ...image, ...ctx.dims[image.src] }));
      return (
        <div key={key} className="clear-both my-8">
          <EventGallery images={images} layout={attrs.layout as "grid"} columns={Number(attrs.columns)} />
        </div>
      );
    }
    case "video":
      return (
        <div key={key} className="clear-both">
          <EmbedVideo attrs={attrs} />
        </div>
      );
    case "callout": {
      const tone = CALLOUT[attrs.tone as keyof typeof CALLOUT] ?? CALLOUT.info;
      const color = attrs.color ? String(attrs.color) : tone.color;
      const Icon = tone.icon;
      return (
        <aside
          key={key}
          className="clear-both my-6 flex gap-3 rounded-[var(--form-card-radius,1rem)] border-l-4 p-5 [&>div>*:first-child]:mt-0 [&>div>*:last-child]:mb-0"
          style={{ borderColor: color, backgroundColor: `${color}14` } as CSSProperties}
        >
          <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color }} aria-hidden />
          <div className="min-w-0 flex-1">{blocks(node.content, ctx)}</div>
        </aside>
      );
    }
    case "columns":
      return (
        <div key={key} className={cn("clear-both my-6 grid gap-6", node.content?.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
          {blocks(node.content, ctx)}
        </div>
      );
    case "column":
      return (
        <div key={key} className="min-w-0 flow-root [&>*:first-child]:mt-0">
          {blocks(node.content, ctx)}
        </div>
      );
    case "button": {
      const href = String(attrs.href);
      const external = !href.startsWith("/");
      const variant = String(attrs.variant);
      return (
        <p key={key} className={cn("clear-both my-6", attrs.align === "center" && "text-center", attrs.align === "right" && "text-right")}>
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
            className={cn(
              "inline-flex items-center rounded-full px-6 py-3 font-extrabold transition hover:opacity-90",
              variant === "outline"
                ? "border-2 border-[var(--event-primary)] text-[var(--event-primary)]"
                : "text-white shadow-lg",
            )}
            style={variant === "outline" ? undefined : { background: variant === "accent" ? "var(--event-accent)" : "var(--event-primary)" }}
          >
            {String(attrs.label)}
          </a>
        </p>
      );
    }
    case "spacer":
      return <div key={key} className={cn("clear-both", SPACER[String(attrs.size)])} aria-hidden />;
    default:
      return null;
  }
}

export function EventContent({ doc, dims = {} }: { doc: EventDoc | null; dims?: Dimensions }) {
  const clean = sanitizeDoc(doc);
  if (!clean) return null;
  return <div className="flow-root text-base sm:text-lg">{blocks(clean.content, { dims })}</div>;
}
