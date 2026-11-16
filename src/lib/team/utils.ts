import { isEmptyDoc, imagesMissingAlt, type EventDoc } from "@/lib/events/content";
import { parseFocus } from "@/lib/events/utils";
import { parseDepartmentTheme } from "./theme";
import { BUREAU_POSITIONS, GALLERY_MODES, type BureauMember, type BureauPosition, type DepartmentCard, type DepartmentStatus, type GalleryMode } from "./types";

// Pure helpers (no server imports): used by queries, actions, components and tests.

export const STORAGE_BUCKET = "event-media";
export const TEAM_PREFIX = "team/";

export const CARD_COLUMNS =
  "id, slug, status, name_fr, name_en, tagline_fr, tagline_en, leader_name, leader_photo_url, leader_photo_focus, theme, sort_order";

export function isBureauPosition(value: unknown): value is BureauPosition {
  return BUREAU_POSITIONS.includes(value as BureauPosition);
}

export function parseGalleryMode(value: unknown): GalleryMode {
  return GALLERY_MODES.includes(value as GalleryMode) ? (value as GalleryMode) : "group";
}

const str = (value: unknown) => (typeof value === "string" ? value : null);

export function toDepartmentCard(row: Record<string, unknown>): DepartmentCard {
  return {
    id: String(row.id),
    slug: String(row.slug),
    status: row.status === "published" ? "published" : ("draft" as DepartmentStatus),
    name_fr: String(row.name_fr ?? ""),
    name_en: str(row.name_en),
    tagline_fr: str(row.tagline_fr),
    tagline_en: str(row.tagline_en),
    leader_name: str(row.leader_name),
    leader_photo_url: str(row.leader_photo_url),
    leader_photo_focus: parseFocus(row.leader_photo_focus),
    theme: parseDepartmentTheme(row.theme),
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

/** Default labels when a bureau row has none. */
const BUREAU_ROLES: Record<BureauPosition, { fr: string; en: string }> = {
  president: { fr: "Président(e)", en: "President" },
  vice_president: { fr: "Vice-président(e)", en: "Vice president" },
};

export function toBureauMember(row: Record<string, unknown>): BureauMember | null {
  if (!isBureauPosition(row.position)) return null;
  const position = row.position;
  return {
    id: String(row.id),
    position,
    full_name: String(row.full_name ?? ""),
    role_fr: str(row.role_title_fr) || BUREAU_ROLES[position].fr,
    role_en: str(row.role_title_en) || BUREAU_ROLES[position].en,
    bio_fr: str(row.bio_fr) ?? "",
    bio_en: str(row.bio_en) ?? "",
    photo_url: str(row.photo_url),
    photo_focus: parseFocus(row.photo_focus),
    is_visible: row.is_visible !== false,
  };
}

/** President first, then vice-president. */
export function sortBureau(members: BureauMember[]): BureauMember[] {
  return [...members].sort((a, b) => BUREAU_POSITIONS.indexOf(a.position) - BUREAU_POSITIONS.indexOf(b.position));
}

/**
 * Path inside the bucket for one of our public URLs under `team/`, or null.
 * Lets photos be cleaned up without storing their path separately.
 */
export function teamStoragePath(url: string | null | undefined, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""): string | null {
  if (!url || !supabaseUrl) return null;
  const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
  return path.startsWith(TEAM_PREFIX) && !path.includes("..") ? path : null;
}

/** "Amina Benali" → "AB", "  " → "?" (photo placeholder). */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const letters = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

export type DepartmentPublishProblem = "name" | "leader" | "content" | "coverAlt" | "imageAlt";

/** A department page needs a name, a leader and a description; every image needs alt text. */
export function departmentPublishProblems(d: {
  name_fr: string | null;
  leader_name: string | null;
  content_fr: EventDoc | null;
  content_en: EventDoc | null;
  cover_url: string | null;
  cover_alt: string | null;
}): DepartmentPublishProblem[] {
  const problems: DepartmentPublishProblem[] = [];
  if (!d.name_fr?.trim()) problems.push("name");
  if (!d.leader_name?.trim()) problems.push("leader");
  if (isEmptyDoc(d.content_fr)) problems.push("content");
  if (d.cover_url && !d.cover_alt?.trim()) problems.push("coverAlt");
  if (imagesMissingAlt(d.content_fr) + imagesMissingAlt(d.content_en) > 0) problems.push("imageAlt");
  return problems;
}
