import type { EventDoc } from "@/lib/events/content";
import type { CoverFocus } from "@/lib/events/types";
import type { DepartmentTheme } from "./theme";

export type DepartmentStatus = "draft" | "published";

export const BUREAU_POSITIONS = ["president", "vice_president"] as const;
export type BureauPosition = (typeof BUREAU_POSITIONS)[number];

/** How the "Équipe" images section of a department page is built. */
export const GALLERY_MODES = ["group", "members", "both"] as const;
export type GalleryMode = (typeof GALLERY_MODES)[number];

/** President or vice-president (the only two people shown outside a department). */
export type BureauMember = {
  id: string;
  position: BureauPosition;
  full_name: string;
  role_fr: string;
  role_en: string;
  bio_fr: string;
  bio_en: string;
  photo_url: string | null;
  photo_focus: CoverFocus;
  is_visible: boolean;
};

/** Fields needed to draw a department card on /team. */
export type DepartmentCard = {
  id: string;
  slug: string;
  status: DepartmentStatus;
  name_fr: string;
  name_en: string | null;
  tagline_fr: string | null;
  tagline_en: string | null;
  leader_name: string | null;
  leader_photo_url: string | null;
  leader_photo_focus: CoverFocus;
  theme: DepartmentTheme;
  sort_order: number;
};

export type DepartmentMedia = {
  id: string;
  url: string;
  storage_path: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  alt: string | null;
  caption: string | null;
  sort_order: number;
};

/** A member card: photo and name only. */
export type DepartmentMember = {
  id: string;
  full_name: string;
  photo_url: string | null;
  photo_focus: CoverFocus;
  sort_order: number;
};

/** Everything the department page and the admin editor need. */
export type DepartmentFull = DepartmentCard & {
  content_fr: EventDoc | null;
  content_en: EventDoc | null;
  leader_role_fr: string | null;
  leader_role_en: string | null;
  leader_bio_fr: string | null;
  leader_bio_en: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  cover_focus: CoverFocus;
  gallery_mode: GalleryMode;
  updated_at: string;
  media: DepartmentMedia[];
  members: DepartmentMember[];
};
