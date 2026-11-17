// Pure helpers for the media library (no server imports): safe in server code, client components and tests.
import { z } from "zod";

export const MEDIA_KINDS = ["image", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const ORIENTATIONS = ["horizontal", "vertical", "square"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

/** Files accepted in the library and their kind. */
export const ALLOWED_TYPES: Record<string, MediaKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/heic": "image",
  "image/heif": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
};

/** Browsers on Windows often give HEIC and MOV files no type: fall back to the extension. */
const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export const MAX_FILE_BYTES = 10 * 1024 ** 3; // 10 GB per file (Google allows up to 5 TB)
export const PAGE_SIZE = 48;

export function mimeOf(file: { name: string; type: string }) {
  if (file.type && ALLOWED_TYPES[file.type]) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[extension] ?? file.type ?? "";
}

export function kindOf(mimeType: string): MediaKind | null {
  return ALLOWED_TYPES[mimeType] ?? null;
}

/** Formats the browser cannot show (only download). */
export function isPreviewable(mimeType: string) {
  return mimeType !== "image/heic" && mimeType !== "image/heif";
}

/** Within 5 % of a square counts as square; otherwise the longer side decides. */
export function orientationOf(width: number | null | undefined, height: number | null | undefined): Orientation | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const ratio = width / height;
  if (ratio > 1.05) return "horizontal";
  if (ratio < 1 / 1.05) return "vertical";
  return "square";
}

/** Video resolution classes, best first. */
export const RESOLUTIONS = ["uhd", "qhd", "fhd", "hd", "sd"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

/** Short labels shown on chips and badges (the same in every language). */
export const RESOLUTION_LABELS: Record<Resolution, string> = { uhd: "4K", qhd: "1440p", fhd: "1080p", hd: "720p", sd: "SD" };

/**
 * Resolution class from the shorter side (vertical 1080×1920 = 1080p). Thresholds leave room
 * for odd sizes. Must match the generated column in 20261120000000_media_resolution.sql.
 */
export function resolutionOf(width: number | null | undefined, height: number | null | undefined): Resolution | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const short = Math.min(width, height);
  if (short >= 2000) return "uhd";
  if (short >= 1400) return "qhd";
  if (short >= 1000) return "fhd";
  if (short >= 700) return "hd";
  return "sd";
}

// ───────── Inputs ─────────

export const folderNameSchema = z.string().trim().min(1).max(80);
export const fileNameSchema = z.string().trim().min(1).max(255);

export const uploadSessionSchema = z.object({
  folderId: z.uuid(),
  name: fileNameSchema,
  mimeType: z.string().refine((value) => value in ALLOWED_TYPES, "type_not_allowed"),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
});

const dimension = z.number().int().positive().max(100_000).nullish();

export const finalizeSchema = z.object({
  folderId: z.uuid(),
  driveFileId: z.string().regex(/^[A-Za-z0-9_-]{10,200}$/),
  width: dimension,
  height: dimension,
  durationS: z.number().nonnegative().max(1e7).nullish(),
  thumbPath: z.string().max(300).nullish(),
});

/** Where a file's thumbnail lives in the `media-thumbs` bucket. */
export function thumbPathFor(folderId: string, driveFileId: string) {
  return `${folderId}/${driveFileId}.webp`;
}

// ───────── Browsing ─────────

export type AssetFilters = { kind: MediaKind | null; orientation: Orientation | null; resolution: Resolution | null };

/** Drops values that are unknown, and the resolution unless the filter is on videos. */
export function cleanFilters(filters: Partial<Record<keyof AssetFilters, unknown>>): AssetFilters {
  const kind = (MEDIA_KINDS as readonly unknown[]).includes(filters.kind) ? (filters.kind as MediaKind) : null;
  const orientation = (ORIENTATIONS as readonly unknown[]).includes(filters.orientation) ? (filters.orientation as Orientation) : null;
  const resolution =
    kind === "video" && (RESOLUTIONS as readonly unknown[]).includes(filters.resolution) ? (filters.resolution as Resolution) : null;
  return { kind, orientation, resolution };
}

export function parseFilters(query: Record<string, string | string[] | undefined>): AssetFilters {
  return cleanFilters({ kind: query.kind, orientation: query.o, resolution: query.r });
}

/** Keyset cursor: the last row's (created_at, id). */
export function encodeCursor(row: { created_at: string; id: string }) {
  return `${row.created_at}|${row.id}`;
}

export function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return null;
  const [createdAt, id] = cursor.split("|");
  if (!createdAt || !id || Number.isNaN(Date.parse(createdAt)) || !z.uuid().safeParse(id).success) return null;
  return { createdAt, id };
}

// ───────── Display ─────────

export function formatBytes(bytes: number, locale = "fr") {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0 }).format(value)} ${units[unit]}`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** `Content-Disposition` that keeps accents and spaces in the downloaded file name. */
export function contentDisposition(name: string, download: boolean) {
  const fallback = name.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "file";
  return `${download ? "attachment" : "inline"}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
