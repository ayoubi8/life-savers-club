/**
 * Event page content: a TipTap/ProseMirror JSON document.
 *
 * Stored JSON is never trusted. `sanitizeDoc` keeps only the node types, marks and
 * attributes listed below, with every value checked (colours, sizes, URLs). It runs
 * when content is saved and again before it is rendered, so the renderer can map
 * nodes to React elements without ever injecting HTML.
 */

export type EventNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EventNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};
export type EventDoc = { type: "doc"; content: EventNode[] };

export const EMPTY_DOC: EventDoc = { type: "doc", content: [{ type: "paragraph" }] };

// ───────── Allowed values ─────────
export const FONT_SIZES = ["sm", "base", "lg", "xl", "2xl", "3xl"] as const;
export const TEXT_ALIGNS = ["left", "center", "right", "justify"] as const;
export const IMAGE_WIDTHS = ["25", "33", "50", "75", "100", "full"] as const;
export const IMAGE_ALIGNS = ["left", "center", "right"] as const;
export const GALLERY_LAYOUTS = ["grid", "masonry", "carousel"] as const;
export const CALLOUT_TONES = ["info", "heart", "warning", "success"] as const;
export const BUTTON_VARIANTS = ["primary", "accent", "outline"] as const;
export const SPACER_SIZES = ["sm", "md", "lg"] as const;
export const VIDEO_PROVIDERS = ["youtube", "vimeo", "facebook", "instagram", "tiktok", "drive", "file"] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

const MAX_NODES = 5000;
const MAX_DEPTH = 12;
const MAX_TEXT = 20000;
const MAX_ATTR = 500;
const MAX_GALLERY = 60;
const HEX = /^#[0-9a-fA-F]{6}$/;

// ───────── URL checks ─────────

/** Public URL prefix of the event-media bucket, e.g. https://x.supabase.co/storage/v1/object/public/event-media/ */
export function mediaBaseUrl(supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/event-media/`;
}

/** A file in our own event-media bucket (no path tricks). */
export function isOwnMedia(url: unknown, base: string): url is string {
  return (
    typeof url === "string" &&
    base.startsWith("https://") &&
    url.startsWith(base) &&
    url.length < MAX_ATTR &&
    !url.slice(base.length).includes("..") &&
    /^[A-Za-z0-9/_.-]+$/.test(url.slice(base.length))
  );
}

/** Links: http(s), mailto, tel, or a site-relative path. Never javascript:, data:, //host. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!href || href.length > MAX_ATTR) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

type ParsedVideo = { provider: Exclude<VideoProvider, "file">; embedUrl: string };

/**
 * Turns a pasted share link into a canonical embed URL from a known provider.
 * Returns null for anything else.
 */
export function parseVideoUrl(input: string): ParsedVideo | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const id = (value: string | undefined | null, pattern: RegExp) => (value && pattern.test(value) ? value : null);

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    const ytId = /^[A-Za-z0-9_-]{11}$/;
    const videoId =
      host === "youtu.be"
        ? id(parts[0], ytId)
        : parts[0] === "watch"
          ? id(url.searchParams.get("v"), ytId)
          : ["embed", "shorts", "live"].includes(parts[0] ?? "")
            ? id(parts[1], ytId)
            : null;
    return videoId ? { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}` } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const videoId = id(parts[0] === "video" ? parts[1] : parts[0], /^\d{6,12}$/);
    return videoId ? { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${videoId}` } : null;
  }
  if (host === "facebook.com" || host === "fb.watch") {
    if (host === "facebook.com" && parts[0] === "plugins" && parts[1] === "video.php") {
      const inner = url.searchParams.get("href");
      return inner ? parseVideoUrl(inner) : null;
    }
    const looksLikeVideo =
      host === "fb.watch" || parts.includes("videos") || parts[0] === "watch" || parts[0] === "reel" || parts[0] === "share";
    if (!looksLikeVideo) return null;
    const clean = `https://${host === "fb.watch" ? "fb.watch" : "www.facebook.com"}${url.pathname}${
      parts[0] === "watch" && url.searchParams.get("v") ? `?v=${encodeURIComponent(url.searchParams.get("v")!)}` : ""
    }`;
    if (!/^[A-Za-z0-9/._?=%-]+$/.test(clean.replace(/^https:\/\//, ""))) return null;
    return {
      provider: "facebook",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(clean)}&show_text=false`,
    };
  }
  if (host === "instagram.com") {
    const kind = parts[0];
    const postId = id(parts[1], /^[A-Za-z0-9_-]{5,40}$/);
    return postId && ["p", "reel", "tv"].includes(kind ?? "")
      ? { provider: "instagram", embedUrl: `https://www.instagram.com/${kind}/${postId}/embed` }
      : null;
  }
  if (host === "tiktok.com") {
    const index = parts.indexOf("video");
    const videoId = id(index >= 0 ? parts[index + 1] : parts[0] === "embed" ? parts.at(-1) : null, /^\d{10,25}$/);
    return videoId ? { provider: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${videoId}` } : null;
  }
  if (host === "drive.google.com") {
    const fileId = id(parts[0] === "file" && parts[1] === "d" ? parts[2] : url.searchParams.get("id"), /^[A-Za-z0-9_-]{20,80}$/);
    return fileId ? { provider: "drive", embedUrl: `https://drive.google.com/file/d/${fileId}/preview` } : null;
  }
  return null;
}

/** Re-validates a stored embed URL: it must be exactly what parseVideoUrl produces. */
export function isAllowedEmbed(provider: unknown, src: unknown): boolean {
  if (typeof src !== "string" || typeof provider !== "string" || src.length > 800) return false;
  const parsed = parseVideoUrl(src);
  return parsed !== null && parsed.provider === provider && parsed.embedUrl === src;
}

// ───────── Attribute helpers ─────────

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
function text(value: unknown, max = MAX_ATTR): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}
function color(value: unknown): string | null {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : null;
}
function bool(value: unknown): boolean {
  return value === true;
}
function int(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}
function align(attrs: Record<string, unknown>) {
  const value = attrs.textAlign;
  return TEXT_ALIGNS.includes(value as never) && value !== "left" ? { textAlign: value as string } : {};
}

// ───────── Marks ─────────

function cleanMarks(marks: unknown): EventNode["marks"] {
  if (!Array.isArray(marks)) return undefined;
  const out: NonNullable<EventNode["marks"]> = [];
  for (const mark of marks.slice(0, 10)) {
    if (!mark || typeof mark !== "object") continue;
    const { type, attrs } = mark as { type?: unknown; attrs?: Record<string, unknown> };
    const a = attrs && typeof attrs === "object" ? attrs : {};
    switch (type) {
      case "bold":
      case "italic":
      case "underline":
      case "strike":
        out.push({ type });
        break;
      case "link": {
        const href = safeHref(a.href);
        if (href) out.push({ type, attrs: { href } });
        break;
      }
      case "textStyle": {
        const c = color(a.color);
        const size = FONT_SIZES.includes(a.fontSize as never) ? (a.fontSize as string) : null;
        if (c || size) out.push({ type, attrs: { ...(c ? { color: c } : {}), ...(size ? { fontSize: size } : {}) } });
        break;
      }
      case "highlight":
        out.push({ type, attrs: { color: color(a.color) ?? "#fff3a3" } });
        break;
    }
  }
  return out.length ? out : undefined;
}

// ───────── Nodes ─────────

type Context = { base: string; count: number };

const INLINE = new Set(["text", "hardBreak"]);

function children(node: Record<string, unknown>, ctx: Context, depth: number, allowed?: Set<string>): EventNode[] {
  const list = Array.isArray(node.content) ? node.content : [];
  const out: EventNode[] = [];
  for (const child of list) {
    const clean = cleanNode(child, ctx, depth + 1);
    if (clean && (!allowed || allowed.has(clean.type))) out.push(clean);
  }
  return out;
}

function cleanImage(raw: Record<string, unknown>, base: string) {
  if (!isOwnMedia(raw.src, base)) return null;
  return {
    src: raw.src,
    alt: text(raw.alt, 300),
    caption: text(raw.caption, 300),
    mediaId: typeof raw.mediaId === "string" && /^[0-9a-f-]{36}$/i.test(raw.mediaId) ? raw.mediaId : null,
  };
}

function cleanNode(input: unknown, ctx: Context, depth: number): EventNode | null {
  if (!input || typeof input !== "object" || depth > MAX_DEPTH) return null;
  if (++ctx.count > MAX_NODES) return null;
  const node = input as Record<string, unknown>;
  const attrs = (node.attrs && typeof node.attrs === "object" ? node.attrs : {}) as Record<string, unknown>;

  switch (node.type) {
    case "text": {
      const value = text(node.text, MAX_TEXT);
      if (!value) return null;
      const marks = cleanMarks(node.marks);
      return marks ? { type: "text", text: value, marks } : { type: "text", text: value };
    }
    case "hardBreak":
      return { type: "hardBreak" };
    case "paragraph": {
      const content = children(node, ctx, depth, INLINE);
      const a = align(attrs);
      return { type: "paragraph", ...(Object.keys(a).length ? { attrs: a } : {}), ...(content.length ? { content } : {}) };
    }
    case "heading": {
      const content = children(node, ctx, depth, INLINE);
      return { type: "heading", attrs: { level: int(attrs.level, 2, 4, 2), ...align(attrs) }, ...(content.length ? { content } : {}) };
    }
    case "bulletList":
    case "orderedList": {
      const content = children(node, ctx, depth, new Set(["listItem"]));
      if (!content.length) return null;
      return node.type === "orderedList"
        ? { type: "orderedList", attrs: { start: int(attrs.start, 1, 10000, 1) }, content }
        : { type: "bulletList", content };
    }
    case "listItem": {
      const content = children(node, ctx, depth, new Set(["paragraph", "bulletList", "orderedList"]));
      return content.length ? { type: "listItem", content } : null;
    }
    case "blockquote": {
      const content = children(node, ctx, depth, new Set(["paragraph", "heading", "bulletList", "orderedList"]));
      return content.length ? { type: "blockquote", content } : null;
    }
    case "horizontalRule":
      return { type: "horizontalRule" };
    case "image": {
      const image = cleanImage(attrs, ctx.base);
      if (!image) return null;
      return {
        type: "image",
        attrs: {
          ...image,
          width: pick(attrs.width, IMAGE_WIDTHS, "100"),
          align: pick(attrs.align, IMAGE_ALIGNS, "center"),
          rounded: attrs.rounded !== false,
          shadow: bool(attrs.shadow),
          border: bool(attrs.border),
        },
      };
    }
    case "gallery": {
      const images = (Array.isArray(attrs.images) ? attrs.images : [])
        .slice(0, MAX_GALLERY)
        .map((item) => (item && typeof item === "object" ? cleanImage(item as Record<string, unknown>, ctx.base) : null))
        .filter((item): item is NonNullable<typeof item> => item !== null);
      if (!images.length) return null;
      return {
        type: "gallery",
        attrs: { images, layout: pick(attrs.layout, GALLERY_LAYOUTS, "grid"), columns: int(attrs.columns, 2, 4, 3) },
      };
    }
    case "video": {
      const provider = pick(attrs.provider, VIDEO_PROVIDERS, "youtube");
      const common = { title: text(attrs.title, 200), caption: text(attrs.caption, 300) };
      if (provider === "file") {
        if (!isOwnMedia(attrs.src, ctx.base)) return null;
        return {
          type: "video",
          attrs: {
            ...common,
            provider,
            src: attrs.src,
            poster: isOwnMedia(attrs.poster, ctx.base) ? attrs.poster : null,
            loop: bool(attrs.loop),
          },
        };
      }
      if (!isAllowedEmbed(provider, attrs.src)) return null;
      return { type: "video", attrs: { ...common, provider, src: attrs.src } };
    }
    case "callout": {
      const content = children(node, ctx, depth, new Set(["paragraph", "heading", "bulletList", "orderedList"]));
      if (!content.length) return null;
      return {
        type: "callout",
        attrs: { tone: pick(attrs.tone, CALLOUT_TONES, "info"), color: color(attrs.color) },
        content,
      };
    }
    case "columns": {
      const content = children(node, ctx, depth, new Set(["column"])).slice(0, 3);
      return content.length >= 2 ? { type: "columns", content } : null;
    }
    case "column": {
      const content = children(node, ctx, depth, BLOCKS_IN_COLUMN);
      return { type: "column", content: content.length ? content : [{ type: "paragraph" }] };
    }
    case "button": {
      const href = safeHref(attrs.href);
      const label = text(attrs.label, 80).trim();
      if (!href || !label) return null;
      return {
        type: "button",
        attrs: { href, label, variant: pick(attrs.variant, BUTTON_VARIANTS, "primary"), align: pick(attrs.align, IMAGE_ALIGNS, "left") },
      };
    }
    case "spacer":
      return { type: "spacer", attrs: { size: pick(attrs.size, SPACER_SIZES, "md") } };
    default:
      return null;
  }
}

const BLOCKS_IN_COLUMN = new Set([
  "paragraph", "heading", "bulletList", "orderedList", "blockquote", "image", "video", "callout", "button", "spacer", "horizontalRule",
]);

/** Returns a safe document, or null when nothing usable is left. */
export function sanitizeDoc(input: unknown, base = mediaBaseUrl()): EventDoc | null {
  if (!input || typeof input !== "object" || (input as { type?: unknown }).type !== "doc") return null;
  const ctx: Context = { base, count: 0 };
  const content = children(input as Record<string, unknown>, ctx, 0).filter((node) => !INLINE.has(node.type));
  return content.length ? { type: "doc", content } : null;
}

/** True when the document has no visible content (only empty paragraphs). */
export function isEmptyDoc(doc: EventDoc | null): boolean {
  return !doc || doc.content.every((node) => node.type === "paragraph" && !node.content?.length);
}

/** Images (including gallery items) whose alt text is missing: publishing is blocked until filled. */
export function imagesMissingAlt(doc: EventDoc | null): number {
  let missing = 0;
  const visit = (node: EventNode) => {
    if (node.type === "image" && !String(node.attrs?.alt ?? "").trim()) missing += 1;
    if (node.type === "gallery") {
      for (const image of (node.attrs?.images as { alt: string }[]) ?? []) if (!image.alt.trim()) missing += 1;
    }
    node.content?.forEach(visit);
  };
  doc?.content.forEach(visit);
  return missing;
}

/** URLs of every image, gallery photo and uploaded video placed in the document. */
export function docMediaUrls(doc: EventDoc | null): Set<string> {
  const urls = new Set<string>();
  const visit = (node: EventNode) => {
    if ((node.type === "image" || node.type === "video") && typeof node.attrs?.src === "string") urls.add(node.attrs.src);
    if (node.type === "video" && typeof node.attrs?.poster === "string") urls.add(node.attrs.poster);
    if (node.type === "gallery") for (const image of (node.attrs?.images as { src: string }[]) ?? []) urls.add(image.src);
    node.content?.forEach(visit);
  };
  doc?.content.forEach(visit);
  return urls;
}

/** A simple document from plain text (one paragraph per line), used for seeds and quick create. */
export function docFromText(value: string): EventDoc {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length
    ? { type: "doc", content: lines.map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] })) }
    : EMPTY_DOC;
}
