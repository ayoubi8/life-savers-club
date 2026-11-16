import { cache } from "react";
import { getSessionProfile } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { sanitizeDoc } from "./content";
import { eventEnd } from "./ics";
import type { EventCard, EventFull, EventMedia, EventStatus } from "./types";
import { CARD_COLUMNS, parseEventsPageSettings, parseSocialLinks, toCard } from "./utils";

/**
 * Public queries always filter on `status = 'published'` explicitly: RLS also lets
 * leaders read drafts, and a logged-in leader must see the same public page as visitors.
 */

/** Past published events, newest first (the /events page). */
export const getPastEvents = cache(async (): Promise<EventCard[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(500);
  return (data ?? []).map((row) => toCard(row as Record<string, unknown>));
});

/** Home page: upcoming events first, then featured past events to fill the section. */
export const getUpcomingAndFeatured = cache(async (limit = 3) => {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [upcoming, featured] = await Promise.all([
    supabase
      .from("events")
      .select(CARD_COLUMNS)
      .eq("status", "published")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(limit),
    supabase
      .from("events")
      .select(CARD_COLUMNS)
      .eq("status", "published")
      .eq("featured", true)
      .lt("starts_at", now)
      .order("featured_order", { ascending: true })
      .limit(limit),
  ]);
  return {
    upcoming: (upcoming.data ?? []).map((row) => toCard(row as Record<string, unknown>)),
    featured: (featured.data ?? []).map((row) => toCard(row as Record<string, unknown>)),
  };
});

const FULL_COLUMNS = `${CARD_COLUMNS}, status, content_fr, content_en, attendee_count, registration_form_id, show_registration, social_links, updated_at, registration_form:forms!events_registration_form_id_fkey(slug, status)`;

function toFull(row: Record<string, unknown>, media: EventMedia[]): EventFull {
  const form = row.registration_form as { slug: string; status: string } | null;
  return {
    ...toCard(row),
    status: row.status as EventStatus,
    content_fr: sanitizeDoc(row.content_fr),
    content_en: sanitizeDoc(row.content_en),
    attendee_count: (row.attendee_count as number | null) ?? null,
    registration_form_id: (row.registration_form_id as string | null) ?? null,
    registration_form_slug: form?.status === "published" ? form.slug : null,
    show_registration: row.show_registration === true,
    social_links: parseSocialLinks(row.social_links),
    upcoming: eventEnd(String(row.starts_at), (row.ends_at as string | null) ?? null).getTime() > Date.now(),
    updated_at: String(row.updated_at),
    media,
  };
}

async function loadMedia(eventId: string): Promise<EventMedia[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_media")
    .select("id, event_id, url, kind, storage_path, width, height, size_bytes, alt, caption, sort_order, created_at")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as EventMedia[];
}

/**
 * Event page. Drafts are returned only to active leaders (`preview: true` in the result),
 * the same rule as draft forms in /f/[slug].
 */
export const getEventBySlug = cache(async (slug: string): Promise<{ event: EventFull; preview: boolean } | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select(FULL_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  let preview = false;
  if (row.status !== "published") {
    const { profile } = await getSessionProfile();
    if (!can(profile, "events")) return null;
    preview = true;
  }
  return { event: toFull(row, await loadMedia(String(row.id))), preview };
});

/** Admin editor: any status (RLS restricts to leaders). */
export const getEventForAdmin = cache(async (id: string): Promise<EventFull | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [{ data }, media] = await Promise.all([
    supabase.from("events").select(FULL_COLUMNS).eq("id", id).maybeSingle(),
    loadMedia(id),
  ]);
  return data ? toFull(data as unknown as Record<string, unknown>, media) : null;
});

/** Admin list: every event with status, newest first. */
export const getAllEventsForAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(`${CARD_COLUMNS}, status, updated_at`)
    .order("starts_at", { ascending: false })
    .limit(1000);
  const now = Date.now();
  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    const card = toCard(raw);
    return { ...card, status: raw.status as EventStatus, updated_at: String(raw.updated_at), upcoming: Date.parse(card.starts_at) >= now };
  });
});

/** Previous / next published past events around a date, for the event page footer. */
export const getAdjacentEvents = cache(async (startsAt: string) => {
  const supabase = await createClient();
  const [older, newer] = await Promise.all([
    supabase.from("events").select("slug, title_fr, title_en").eq("status", "published")
      .lt("starts_at", startsAt).order("starts_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("events").select("slug, title_fr, title_en").eq("status", "published")
      .gt("starts_at", startsAt).order("starts_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  return { older: older.data, newer: newer.data };
});

export const getEventsPageSettings = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "events_page").maybeSingle();
  return parseEventsPageSettings(data?.value);
});
