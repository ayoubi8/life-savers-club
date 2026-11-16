/** Pure helpers (no server imports), shared by pages, actions and tests. */
import { parseEventTheme } from "./theme";
import {
  DIVIDER_STYLES,
  LIST_LAYOUTS,
  SOCIAL_NETWORKS,
  STAT_ICONS,
  type CoverFocus,
  type SocialLinks,
  type SocialNetwork,
  type EventCard,
  type EventStat,
  type EventsPageSettings,
  type Locale,
} from "./types";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** French is the source language; English falls back to it when empty. */
export function localized(fr: string | null | undefined, en: string | null | undefined, locale: string): string {
  return (locale === "en" && en?.trim() ? en : fr) ?? "";
}

export function asLocale(value: string): Locale {
  return value === "en" ? "en" : "fr";
}

const SOCIAL_HOSTS: Record<SocialNetwork, RegExp> = {
  instagram: /^(www\.)?(instagram\.com|instagr\.am)$/,
  facebook: /^([a-z0-9-]+\.)?(facebook\.com|fb\.com|fb\.watch)$/,
  tiktok: /^([a-z0-9-]+\.)?tiktok\.com$/,
};

/**
 * One social link → canonical https URL, or null when it is not a link to that network.
 * Instagram and TikTok share links carry tracking parameters (?igsh=…), which are dropped;
 * Facebook keeps its query because some post URLs need it (permalink.php?story_fbid=…).
 */
export function cleanSocialLink(network: SocialNetwork, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > 500) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (!SOCIAL_HOSTS[network].test(host)) return null;
  url.protocol = "https:";
  url.hash = "";
  if (network !== "facebook") url.search = "";
  return url.toString();
}

/** Stored JSON → only the networks with a valid link. */
export function parseSocialLinks(input: unknown): SocialLinks {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const links: SocialLinks = {};
  for (const network of SOCIAL_NETWORKS) {
    const url = cleanSocialLink(network, raw[network]);
    if (url) links[network] = url;
  }
  return links;
}

/** Networks whose field is filled in but is not a valid link (shown as an error in the admin). */
export function invalidSocialLinks(input: unknown): SocialNetwork[] {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return SOCIAL_NETWORKS.filter((network) => {
    const value = raw[network];
    return typeof value === "string" && value.trim() !== "" && !cleanSocialLink(network, value);
  });
}

export function parseFocus(input: unknown): CoverFocus {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const clamp = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 50;
  return { x: clamp(raw.x), y: clamp(raw.y) };
}

export function parseStats(input: unknown): EventStat[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 8)
    .map((item) => {
      const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
      return {
        value: str(raw.value, 20),
        label_fr: str(raw.label_fr, 60),
        label_en: str(raw.label_en, 60),
        icon: STAT_ICONS.includes(raw.icon as never) ? (raw.icon as EventStat["icon"]) : "users",
      };
    })
    .filter((stat) => stat.value && stat.label_fr);
}

export function parseTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const tag of input) {
    if (typeof tag !== "string") continue;
    const clean = tag.trim().slice(0, 30);
    if (clean) seen.add(clean);
    if (seen.size >= 8) break;
  }
  return [...seen];
}

/** Columns of `events` needed for a card. */
export const CARD_COLUMNS =
  "id, slug, title_fr, title_en, description_fr, description_en, location, starts_at, ends_at, cover_url, cover_alt, cover_focus, tags, stats, featured, featured_order, theme";

/** Normalises a database row (jsonb columns are untrusted) into a card. */
export function toCard(row: Record<string, unknown>): EventCard {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title_fr: String(row.title_fr ?? ""),
    title_en: (row.title_en as string | null) ?? null,
    description_fr: (row.description_fr as string | null) ?? null,
    description_en: (row.description_en as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    starts_at: String(row.starts_at),
    ends_at: (row.ends_at as string | null) ?? null,
    cover_url: (row.cover_url as string | null) ?? null,
    cover_alt: (row.cover_alt as string | null) ?? null,
    cover_focus: parseFocus(row.cover_focus),
    tags: parseTags(row.tags),
    stats: parseStats(row.stats),
    featured: row.featured === true,
    featured_order: typeof row.featured_order === "number" ? row.featured_order : 0,
    theme: parseEventTheme(row.theme),
  };
}

/** Year of an event in the club's timezone (Algeria, UTC+1), so a 31 Dec 23:30 event stays in its year. */
export function eventYear(startsAt: string): number {
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Africa/Algiers" }).format(new Date(startsAt)));
}

/** Groups events (any order) by year, newest year first, newest event first inside a year. */
export function groupByYear<T extends { starts_at: string }>(events: T[]): { year: number; events: T[] }[] {
  const byYear = new Map<number, T[]>();
  for (const event of events) {
    const year = eventYear(event.starts_at);
    byYear.set(year, [...(byYear.get(year) ?? []), event]);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) => ({
      year,
      events: list.sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at)),
    }));
}

export const DEFAULT_EVENTS_PAGE: EventsPageSettings = {
  title_fr: "",
  title_en: "",
  subtitle_fr: "",
  subtitle_en: "",
  layout: "grid2",
  divider: "line",
  dividerColor: "#ef4a6c",
  yearNotes: {},
};

/** Never trusts stored JSON: unknown values fall back to the defaults (empty titles use the translations). */
export function parseEventsPageSettings(input: unknown): EventsPageSettings {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  const notes: EventsPageSettings["yearNotes"] = {};
  if (raw.yearNotes && typeof raw.yearNotes === "object") {
    for (const [year, note] of Object.entries(raw.yearNotes as Record<string, unknown>).slice(0, 50)) {
      if (!/^(19|20)\d{2}$/.test(year) || !note || typeof note !== "object") continue;
      const n = note as Record<string, unknown>;
      const fr = str(n.fr, 120);
      const en = str(n.en, 120);
      if (fr || en) notes[year] = { fr, en };
    }
  }
  return {
    title_fr: str(raw.title_fr, 80),
    title_en: str(raw.title_en, 80),
    subtitle_fr: str(raw.subtitle_fr, 200),
    subtitle_en: str(raw.subtitle_en, 200),
    layout: LIST_LAYOUTS.includes(raw.layout as never) ? (raw.layout as EventsPageSettings["layout"]) : DEFAULT_EVENTS_PAGE.layout,
    divider: DIVIDER_STYLES.includes(raw.divider as never) ? (raw.divider as EventsPageSettings["divider"]) : DEFAULT_EVENTS_PAGE.divider,
    dividerColor: typeof raw.dividerColor === "string" && HEX.test(raw.dividerColor) ? raw.dividerColor.toLowerCase() : DEFAULT_EVENTS_PAGE.dividerColor,
    yearNotes: notes,
  };
}
