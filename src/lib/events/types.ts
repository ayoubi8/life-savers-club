import type { EventTheme } from "./theme";
import type { EventDoc } from "./content";

export type Locale = "fr" | "en";
export type EventStatus = "draft" | "published" | "archived";

export const STAT_ICONS = ["users", "heart", "droplet", "stethoscope", "calendar", "award", "activity", "map-pin"] as const;
export type StatIcon = (typeof STAT_ICONS)[number];

/** A key number shown on the card and the event page ("350 · personnes dépistées"). */
export type EventStat = { value: string; label_fr: string; label_en: string; icon: StatIcon };

export const SOCIAL_NETWORKS = ["instagram", "facebook", "tiktok"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
/** Links to the event's own posts ("Voir sur Instagram"). Only validated https URLs. */
export type SocialLinks = Partial<Record<SocialNetwork, string>>;

/** Focal point of the cover in percent, used as CSS object-position. */
export type CoverFocus = { x: number; y: number };

/** Fields needed to draw an event card (list, home). */
export type EventCard = {
  id: string;
  slug: string;
  title_fr: string;
  title_en: string | null;
  description_fr: string | null;
  description_en: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  cover_focus: CoverFocus;
  tags: string[];
  stats: EventStat[];
  featured: boolean;
  featured_order: number;
  theme: EventTheme;
};

export type EventMedia = {
  id: string;
  event_id: string;
  url: string;
  kind: "image" | "video";
  storage_path: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  alt: string | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

/** Everything the event page and the admin editor need. */
export type EventFull = EventCard & {
  status: EventStatus;
  content_fr: EventDoc | null;
  content_en: EventDoc | null;
  attendee_count: number | null;
  registration_form_id: string | null;
  registration_form_slug: string | null;
  show_registration: boolean;
  social_links: SocialLinks;
  /** Not finished yet (end time, or start + 2 h, still in the future): registration and calendar are offered. */
  upcoming: boolean;
  updated_at: string;
  media: EventMedia[];
};

export const DIVIDER_STYLES = ["line", "pill", "bigYear"] as const;
export const LIST_LAYOUTS = ["grid2", "grid3", "list"] as const;

/** Admin-editable look of the public /events page (site_settings key "events_page"). */
export type EventsPageSettings = {
  title_fr: string;
  title_en: string;
  subtitle_fr: string;
  subtitle_en: string;
  layout: (typeof LIST_LAYOUTS)[number];
  divider: (typeof DIVIDER_STYLES)[number];
  dividerColor: string;
  yearNotes: Record<string, { fr: string; en: string }>;
};
