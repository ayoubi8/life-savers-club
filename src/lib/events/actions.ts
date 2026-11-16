"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSection } from "@/lib/auth";
import { isUuid, slugify } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";
import { docFromText, imagesMissingAlt, isEmptyDoc, isOwnMedia, mediaBaseUrl, sanitizeDoc } from "./content";
import { parseEventTheme } from "./theme";
import { invalidSocialLinks, parseEventsPageSettings, parseFocus, parseSocialLinks, parseStats, parseTags } from "./utils";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type ServerClient = Awaited<ReturnType<typeof createClient>>;

const LOCALES = ["fr", "en"] as const;
const BUCKET = "event-media";

/** Events team (members with the "events" section) or admins. RLS enforces the same rule. */
const requireEvents = () => requireSection("events");

/** Refreshes only the public pages that show events. */
function revalidateEventPages(...slugs: (string | null | undefined)[]) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/events`);
    for (const slug of slugs) if (slug) revalidatePath(`/${locale}/events/${slug}`);
  }
}

async function uniqueSlug(supabase: ServerClient, wanted: string, exceptId?: string) {
  const base = slugify(wanted).slice(0, 70) || "evenement";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    let query = supabase.from("events").select("id").eq("slug", candidate);
    if (exceptId) query = query.neq("id", exceptId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// ───────── Create ─────────

const createSchema = z.object({
  title: z.string().trim().min(2).max(140),
  startsAt: z.iso.datetime({ offset: true }),
});

/** Quick create (title + date) for entering old events fast. Returns the new id. */
export async function createEvent(input: { title: string; startsAt: string }): Promise<Result<{ id: string }>> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { title, startsAt } = parsed.data;
  const slug = await uniqueSlug(ctx.supabase, title);
  const { data, error } = await ctx.supabase
    .from("events")
    .insert({ title_fr: title, slug, starts_at: startsAt, created_by: ctx.profile.id, updated_by: ctx.profile.id })
    .select("id")
    .single();
  return error || !data ? { ok: false, error: "create_failed" } : { ok: true, id: data.id };
}

// ───────── Details ─────────

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => v || null);

const detailsSchema = z.object({
  title_fr: z.string().trim().min(2).max(140),
  title_en: optionalText(140),
  slug: z.string().trim().max(80),
  description_fr: optionalText(400),
  description_en: optionalText(400),
  location: optionalText(140),
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }).nullable().optional(),
  cover_url: z.string().nullable().optional(),
  cover_alt: optionalText(200),
  cover_focus: z.unknown(),
  tags: z.unknown(),
  stats: z.unknown(),
  attendee_count: z.number().int().min(0).max(1_000_000).nullable().optional(),
  registration_form_id: z.string().nullable().optional(),
  show_registration: z.boolean().optional(),
  social_links: z.unknown().optional(),
});

export type EventDetailsInput = z.input<typeof detailsSchema>;

/** Saves the Details tab. Returns the final slug (it may be adjusted to stay unique). */
export async function saveEventDetails(id: string, input: EventDetailsInput): Promise<Result<{ slug: string; updated_at: string }>> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "not_found" };
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;

  if (d.ends_at && Date.parse(d.ends_at) < Date.parse(d.starts_at)) return { ok: false, error: "dates_order" };
  const cover = d.cover_url || null;
  if (cover && !isOwnMedia(cover, mediaBaseUrl())) return { ok: false, error: "image_invalid" };
  const formId = d.registration_form_id || null;
  if (formId && !isUuid(formId)) return { ok: false, error: "invalid" };
  if (invalidSocialLinks(d.social_links).length) return { ok: false, error: "social_invalid" };

  const { data: before } = await ctx.supabase.from("events").select("slug").eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "not_found" };
  const slug = await uniqueSlug(ctx.supabase, d.slug || d.title_fr, id);

  const { data, error } = await ctx.supabase
    .from("events")
    .update({
      title_fr: d.title_fr,
      title_en: d.title_en,
      slug,
      description_fr: d.description_fr,
      description_en: d.description_en,
      location: d.location,
      starts_at: d.starts_at,
      ends_at: d.ends_at ?? null,
      cover_url: cover,
      cover_alt: d.cover_alt,
      cover_focus: parseFocus(d.cover_focus),
      tags: parseTags(d.tags),
      stats: parseStats(d.stats),
      attendee_count: d.attendee_count ?? null,
      registration_form_id: formId,
      show_registration: Boolean(d.show_registration && formId),
      social_links: parseSocialLinks(d.social_links),
      updated_by: ctx.profile.id,
    })
    .eq("id", id)
    .select("updated_at")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  revalidateEventPages(before.slug, slug);
  return { ok: true, slug, updated_at: data.updated_at };
}

// ───────── Content (autosave) ─────────

/**
 * Saves one language of the page content. `baseUpdatedAt` is the version the editor
 * started from: if someone else saved in between, nothing is written and "conflict"
 * is returned (same approach as the form builder).
 */
export async function saveEventContent(
  id: string,
  locale: "fr" | "en",
  doc: unknown,
  baseUpdatedAt: string,
  options: { force?: boolean } = {},
): Promise<Result<{ updated_at: string }>> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id) || !LOCALES.includes(locale)) return { ok: false, error: "invalid" };
  const clean = sanitizeDoc(doc);
  const column = locale === "fr" ? "content_fr" : "content_en";

  let query = ctx.supabase
    .from("events")
    .update({ [column]: isEmptyDoc(clean) ? null : clean, updated_by: ctx.profile.id })
    .eq("id", id);
  if (!options.force) query = query.eq("updated_at", baseUpdatedAt);
  const { data, error } = await query.select("updated_at, slug, status").maybeSingle();
  if (error) return { ok: false, error: "update_failed" };
  if (!data) return { ok: false, error: "conflict" };
  if (data.status === "published") revalidateEventPages(data.slug);
  return { ok: true, updated_at: data.updated_at };
}

// ───────── Design ─────────

export async function saveEventTheme(id: string, theme: unknown): Promise<Result<{ updated_at: string }>> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const { data, error } = await ctx.supabase
    .from("events")
    .update({ theme: parseEventTheme(theme), updated_by: ctx.profile.id })
    .eq("id", id)
    .select("updated_at, slug")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  revalidateEventPages(data.slug);
  return { ok: true, updated_at: data.updated_at };
}

// ───────── Position: featured on home / "À la une" ─────────

export async function setFeatured(id: string, featured: boolean): Promise<Result> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  let order = 0;
  if (featured) {
    const { data } = await ctx.supabase
      .from("events")
      .select("featured_order")
      .eq("featured", true)
      .order("featured_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    order = (data?.featured_order ?? 0) + 1;
  }
  const { data, error } = await ctx.supabase
    .from("events")
    .update({ featured, featured_order: order, updated_by: ctx.profile.id })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  revalidateEventPages(data.slug);
  return { ok: true };
}

export async function reorderFeatured(ids: string[]): Promise<Result> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!Array.isArray(ids) || ids.length > 100 || !ids.every((id) => typeof id === "string" && isUuid(id))) {
    return { ok: false, error: "invalid" };
  }
  const { error } = await ctx.supabase.rpc("reorder_featured_events", { ids });
  if (error) return { ok: false, error: "update_failed" };
  revalidateEventPages();
  return { ok: true };
}

// ───────── Publish ─────────

export type PublishProblem = "title" | "cover" | "coverAlt" | "imageAlt";

/** Publishing requires a French title, a cover photo with alt text, and alt text on every content image. */
export async function publishEvent(id: string): Promise<Result | { ok: false; error: "incomplete"; problems: PublishProblem[] }> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const { data: event } = await ctx.supabase
    .from("events")
    .select("slug, title_fr, cover_url, cover_alt, content_fr, content_en")
    .eq("id", id)
    .maybeSingle();
  if (!event) return { ok: false, error: "not_found" };

  const problems: PublishProblem[] = [];
  if (!event.title_fr?.trim()) problems.push("title");
  if (!event.cover_url) problems.push("cover");
  else if (!event.cover_alt?.trim()) problems.push("coverAlt");
  if (imagesMissingAlt(sanitizeDoc(event.content_fr)) + imagesMissingAlt(sanitizeDoc(event.content_en)) > 0) {
    problems.push("imageAlt");
  }
  if (problems.length) return { ok: false, error: "incomplete", problems };

  const { error } = await ctx.supabase
    .from("events")
    .update({ status: "published", updated_by: ctx.profile.id })
    .eq("id", id);
  if (error) return { ok: false, error: "update_failed" };
  revalidateEventPages(event.slug);
  return { ok: true };
}

export async function unpublishEvent(id: string): Promise<Result> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const { data, error } = await ctx.supabase
    .from("events")
    .update({ status: "draft", updated_by: ctx.profile.id })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  revalidateEventPages(data.slug);
  return { ok: true };
}

// ───────── Duplicate / delete ─────────

/** Copies an event as a draft (same layout, theme, content and media references). */
export async function duplicateEvent(id: string): Promise<Result<{ id: string }>> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const { data: source } = await ctx.supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!source) return { ok: false, error: "not_found" };

  const copy = { ...source };
  // social_links point at the original event's own posts, so the copy starts without them.
  for (const key of ["id", "created_at", "updated_at", "slug", "status", "featured", "featured_order", "social_links"]) delete copy[key];
  const title = `${source.title_fr} (copie)`.slice(0, 140);
  const { data, error } = await ctx.supabase
    .from("events")
    .insert({
      ...copy,
      title_fr: title,
      slug: await uniqueSlug(ctx.supabase, title),
      status: "draft",
      created_by: ctx.profile.id,
      updated_by: ctx.profile.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "create_failed" };

  // The copy shares the same files: rows point at the same storage paths, so deleting
  // one event never removes a file the other still uses (see removeUnusedFiles).
  const { data: media } = await ctx.supabase
    .from("event_media")
    .select("url, kind, storage_path, width, height, size_bytes, alt, caption, sort_order")
    .eq("event_id", id);
  if (media?.length) await ctx.supabase.from("event_media").insert(media.map((row) => ({ ...row, event_id: data.id })));
  return { ok: true, id: data.id };
}

/** Deletes storage files that no event_media row references any more. */
async function removeUnusedFiles(supabase: ServerClient, paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return;
  const { data: stillUsed } = await supabase.from("event_media").select("storage_path").in("storage_path", unique);
  const used = new Set((stillUsed ?? []).map((row) => row.storage_path));
  const unused = unique.filter((path) => !used.has(path));
  if (unused.length) await supabase.storage.from(BUCKET).remove(unused);
}

export async function deleteEvent(id: string): Promise<Result> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const [{ data: event }, { data: media }] = await Promise.all([
    ctx.supabase.from("events").select("slug").eq("id", id).maybeSingle(),
    ctx.supabase.from("event_media").select("storage_path").eq("event_id", id),
  ]);
  if (!event) return { ok: false, error: "not_found" };
  const { error } = await ctx.supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: "delete_failed" };
  await removeUnusedFiles(ctx.supabase, (media ?? []).map((row) => row.storage_path as string));
  revalidateEventPages(event.slug);
  return { ok: true };
}

// ───────── Media library ─────────

const mediaSchema = z.object({
  path: z.string().max(300),
  kind: z.enum(["image", "video"]),
  width: z.number().int().positive().max(20000).nullable().optional(),
  height: z.number().int().positive().max(20000).nullable().optional(),
  size: z.number().int().positive().max(60 * 1024 * 1024),
  alt: optionalText(300),
});

/**
 * Records a file the browser just uploaded to `event-media/events/{eventId}/…`,
 * so it shows in the media library and can be cleaned up later.
 */
export async function registerMedia(
  eventId: string,
  input: z.input<typeof mediaSchema>,
): Promise<Result<{ media: { id: string; url: string } }>> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(eventId)) return { ok: false, error: "invalid" };
  const parsed = mediaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const m = parsed.data;
  if (!new RegExp(`^events/${eventId}/[A-Za-z0-9_.-]+$`).test(m.path)) return { ok: false, error: "invalid" };

  const { data: last } = await ctx.supabase
    .from("event_media")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const url = ctx.supabase.storage.from(BUCKET).getPublicUrl(m.path).data.publicUrl;
  const { data, error } = await ctx.supabase
    .from("event_media")
    .insert({
      event_id: eventId,
      url,
      kind: m.kind,
      storage_path: m.path,
      width: m.width ?? null,
      height: m.height ?? null,
      size_bytes: m.size,
      alt: m.alt,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id, url")
    .single();
  return error || !data ? { ok: false, error: "create_failed" } : { ok: true, media: data };
}

export async function updateMediaAlt(mediaId: string, alt: string): Promise<Result> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(mediaId) || typeof alt !== "string") return { ok: false, error: "invalid" };
  const { error } = await ctx.supabase.from("event_media").update({ alt: alt.trim().slice(0, 300) || null }).eq("id", mediaId);
  return error ? { ok: false, error: "update_failed" } : { ok: true };
}

/** Removes a file from the library (and storage, when no other event shares it). Clears it as cover. */
export async function deleteMedia(mediaId: string): Promise<Result> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(mediaId)) return { ok: false, error: "invalid" };
  const { data: media } = await ctx.supabase
    .from("event_media")
    .select("event_id, url, storage_path")
    .eq("id", mediaId)
    .maybeSingle();
  if (!media) return { ok: false, error: "not_found" };
  const { error } = await ctx.supabase.from("event_media").delete().eq("id", mediaId);
  if (error) return { ok: false, error: "delete_failed" };
  await ctx.supabase.from("events").update({ cover_url: null }).eq("id", media.event_id).eq("cover_url", media.url);
  if (media.storage_path) await removeUnusedFiles(ctx.supabase, [media.storage_path]);
  return { ok: true };
}

/** Uses an image from the event's library as cover (focus reset to the centre). */
export async function setEventCover(eventId: string, mediaId: string): Promise<Result<{ updated_at: string }>> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(eventId) || !isUuid(mediaId)) return { ok: false, error: "invalid" };
  const { data: media } = await ctx.supabase
    .from("event_media")
    .select("url, alt, kind")
    .eq("id", mediaId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!media || media.kind !== "image" || !isOwnMedia(media.url, mediaBaseUrl())) return { ok: false, error: "image_invalid" };
  const { data, error } = await ctx.supabase
    .from("events")
    .update({ cover_url: media.url, cover_alt: media.alt, cover_focus: { x: 50, y: 50 }, updated_by: ctx.profile.id })
    .eq("id", eventId)
    .select("updated_at, slug")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  revalidateEventPages(data.slug);
  return { ok: true, updated_at: data.updated_at };
}

// ───────── Events page settings (events team) ─────────

export async function saveEventsPageSettings(input: unknown): Promise<Result> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  const { error } = await ctx.supabase
    .from("site_settings")
    .upsert({ key: "events_page", value: parseEventsPageSettings(input), updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: "update_failed" };
  revalidateEventPages();
  return { ok: true };
}

// ───────── Helpers for the editor ─────────

/** Starts the English content from the French one (only when English is still empty). */
export async function copyContentToEnglish(id: string, baseUpdatedAt: string): Promise<Result<{ updated_at: string }>> {
  const ctx = await requireEvents();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const { data } = await ctx.supabase.from("events").select("content_fr, content_en").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "not_found" };
  if (!isEmptyDoc(sanitizeDoc(data.content_en))) return { ok: false, error: "not_empty" };
  return saveEventContent(id, "en", data.content_fr ?? docFromText(""), baseUpdatedAt);
}
