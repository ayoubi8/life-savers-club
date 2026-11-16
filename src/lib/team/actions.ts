"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { docFromText, isEmptyDoc, isOwnMedia, mediaBaseUrl, sanitizeDoc } from "@/lib/events/content";
import { parseFocus } from "@/lib/events/utils";
import { isUuid, slugify } from "@/lib/forms/schema";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { parseDepartmentTheme } from "./theme";
import { GALLERY_MODES, type BureauPosition } from "./types";
import { STORAGE_BUCKET, departmentPublishProblems, isBureauPosition, teamStoragePath, type DepartmentPublishProblem } from "./utils";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type ServerClient = Awaited<ReturnType<typeof createClient>>;

const LOCALES = ["fr", "en"] as const;

/** The team section is edited by active admins (president, VP, department leaders). RLS enforces the same rule. */
async function requireTeam() {
  const { profile } = await getSessionProfile();
  if (!isAdmin(profile)) return null;
  return { supabase: await createClient(), profile: profile! };
}

/** Refreshes /team and the given department pages, in both languages. */
function revalidateTeamPages(...slugs: (string | null | undefined)[]) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/team`);
    for (const slug of slugs) if (slug) revalidatePath(`/${locale}/team/${slug}`);
  }
}

/** A photo URL must be one of our own uploads under `team/` (or empty). */
function validPhoto(url: string | null | undefined): url is string {
  return !!url && isOwnMedia(url, mediaBaseUrl()) && teamStoragePath(url) !== null;
}

/** Deletes storage files under `team/` that no department_media row still references. */
async function removeFiles(supabase: ServerClient, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => !!p && p.startsWith("team/")))];
  if (!unique.length) return;
  const { data: stillUsed } = await supabase.from("department_media").select("storage_path").in("storage_path", unique);
  const used = new Set((stillUsed ?? []).map((row) => row.storage_path));
  const unused = unique.filter((path) => !used.has(path));
  if (unused.length) await supabase.storage.from(STORAGE_BUCKET).remove(unused);
}

/** When a photo is replaced or removed, its old file goes too. */
async function removeReplacedPhoto(supabase: ServerClient, before: string | null | undefined, after: string | null) {
  if (before && before !== after) await removeFiles(supabase, [teamStoragePath(before)]);
}

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => v || null);

// ───────── Bureau: president and vice-president ─────────

const bureauSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  role_fr: optionalText(80),
  role_en: optionalText(80),
  bio_fr: optionalText(400),
  bio_en: optionalText(400),
  photo_url: z.string().nullable().optional(),
  photo_focus: z.unknown(),
  is_visible: z.boolean(),
});

export type BureauInput = z.input<typeof bureauSchema>;

export async function saveBureauMember(position: BureauPosition, input: BureauInput): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isBureauPosition(position)) return { ok: false, error: "invalid" };
  const parsed = bureauSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;
  const photo = d.photo_url || null;
  if (photo && !validPhoto(photo)) return { ok: false, error: "image_invalid" };

  const { data: before } = await ctx.supabase.from("team_members").select("photo_url").eq("position", position).maybeSingle();
  if (!before) return { ok: false, error: "not_found" };
  const { error } = await ctx.supabase
    .from("team_members")
    .update({
      full_name: d.full_name,
      role_title_fr: d.role_fr,
      role_title_en: d.role_en,
      bio_fr: d.bio_fr,
      bio_en: d.bio_en,
      photo_url: photo,
      photo_focus: parseFocus(d.photo_focus),
      is_visible: d.is_visible,
      updated_by: ctx.profile.id,
    })
    .eq("position", position);
  if (error) return { ok: false, error: "update_failed" };
  await removeReplacedPhoto(ctx.supabase, before.photo_url, photo);
  revalidateTeamPages();
  return { ok: true };
}

// ───────── Departments: create, details ─────────

async function uniqueSlug(supabase: ServerClient, wanted: string, exceptId?: string) {
  const base = slugify(wanted).slice(0, 70) || "departement";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    let query = supabase.from("departments").select("id").eq("slug", candidate);
    if (exceptId) query = query.neq("id", exceptId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Quick create from a name: a draft placed last on /team. Returns the new id. */
export async function createDepartment(input: { name: string }): Promise<Result<{ id: string }>> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 100) return { ok: false, error: "invalid" };
  const { data: last } = await ctx.supabase
    .from("departments")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await ctx.supabase
    .from("departments")
    .insert({
      name_fr: name,
      slug: await uniqueSlug(ctx.supabase, name),
      leader_role_fr: "Responsable",
      leader_role_en: "Head of department",
      sort_order: (last?.sort_order ?? 0) + 1,
      created_by: ctx.profile.id,
      updated_by: ctx.profile.id,
    })
    .select("id")
    .single();
  return error || !data ? { ok: false, error: "create_failed" } : { ok: true, id: data.id };
}

const detailsSchema = z.object({
  name_fr: z.string().trim().min(2).max(100),
  name_en: optionalText(100),
  slug: z.string().trim().max(80),
  tagline_fr: optionalText(160),
  tagline_en: optionalText(160),
  leader_name: optionalText(120),
  leader_role_fr: optionalText(80),
  leader_role_en: optionalText(80),
  leader_bio_fr: optionalText(500),
  leader_bio_en: optionalText(500),
  leader_photo_url: z.string().nullable().optional(),
  leader_photo_focus: z.unknown(),
});

export type DepartmentDetailsInput = z.input<typeof detailsSchema>;

/** Saves the Détails tab. Returns the final slug (adjusted to stay unique). */
export async function saveDepartmentDetails(id: string, input: DepartmentDetailsInput): Promise<Result<{ slug: string; updated_at: string }>> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "not_found" };
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;
  const photo = d.leader_photo_url || null;
  if (photo && !validPhoto(photo)) return { ok: false, error: "image_invalid" };

  const { data: before } = await ctx.supabase.from("departments").select("slug, leader_photo_url").eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "not_found" };
  const slug = await uniqueSlug(ctx.supabase, d.slug || d.name_fr, id);

  const { data, error } = await ctx.supabase
    .from("departments")
    .update({
      name_fr: d.name_fr,
      name_en: d.name_en,
      slug,
      tagline_fr: d.tagline_fr,
      tagline_en: d.tagline_en,
      leader_name: d.leader_name,
      leader_role_fr: d.leader_role_fr,
      leader_role_en: d.leader_role_en,
      leader_bio_fr: d.leader_bio_fr,
      leader_bio_en: d.leader_bio_en,
      leader_photo_url: photo,
      leader_photo_focus: parseFocus(d.leader_photo_focus),
      updated_by: ctx.profile.id,
    })
    .eq("id", id)
    .select("updated_at")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  await removeReplacedPhoto(ctx.supabase, before.leader_photo_url, photo);
  revalidateTeamPages(before.slug, slug);
  return { ok: true, slug, updated_at: data.updated_at };
}

// ───────── Content (autosave, same conflict rule as events) ─────────

export async function saveDepartmentContent(
  id: string,
  locale: "fr" | "en",
  doc: unknown,
  baseUpdatedAt: string,
  options: { force?: boolean } = {},
): Promise<Result<{ updated_at: string }>> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id) || !LOCALES.includes(locale)) return { ok: false, error: "invalid" };
  const clean = sanitizeDoc(doc);
  const column = locale === "fr" ? "content_fr" : "content_en";

  let query = ctx.supabase
    .from("departments")
    .update({ [column]: isEmptyDoc(clean) ? null : clean, updated_by: ctx.profile.id })
    .eq("id", id);
  if (!options.force) query = query.eq("updated_at", baseUpdatedAt);
  const { data, error } = await query.select("updated_at, slug, status").maybeSingle();
  if (error) return { ok: false, error: "update_failed" };
  if (!data) return { ok: false, error: "conflict" };
  if (data.status === "published") revalidateTeamPages(data.slug);
  return { ok: true, updated_at: data.updated_at };
}

/** Starts the English content from the French one (only when English is still empty). */
export async function copyDepartmentContentToEnglish(id: string, baseUpdatedAt: string): Promise<Result<{ updated_at: string }>> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const { data } = await ctx.supabase.from("departments").select("content_fr, content_en").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "not_found" };
  if (!isEmptyDoc(sanitizeDoc(data.content_en))) return { ok: false, error: "not_empty" };
  return saveDepartmentContent(id, "en", data.content_fr ?? docFromText(""), baseUpdatedAt);
}

// ───────── Design ─────────

export async function saveDepartmentTheme(id: string, theme: unknown): Promise<Result<{ updated_at: string }>> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const { data, error } = await ctx.supabase
    .from("departments")
    .update({ theme: parseDepartmentTheme(theme), updated_by: ctx.profile.id })
    .eq("id", id)
    .select("updated_at, slug")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  revalidateTeamPages(data.slug);
  return { ok: true, updated_at: data.updated_at };
}

// ───────── Order on /team ─────────

const idList = (ids: unknown, max: number): ids is string[] =>
  Array.isArray(ids) && ids.length <= max && ids.every((id) => typeof id === "string" && isUuid(id));

export async function reorderDepartments(ids: string[]): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!idList(ids, 100)) return { ok: false, error: "invalid" };
  const { error } = await ctx.supabase.rpc("reorder_departments", { ids });
  if (error) return { ok: false, error: "update_failed" };
  revalidateTeamPages();
  return { ok: true };
}

// ───────── Publish ─────────

export async function publishDepartment(id: string): Promise<Result | { ok: false; error: "incomplete"; problems: DepartmentPublishProblem[] }> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const { data: d } = await ctx.supabase
    .from("departments")
    .select("slug, name_fr, leader_name, content_fr, content_en, cover_url, cover_alt")
    .eq("id", id)
    .maybeSingle();
  if (!d) return { ok: false, error: "not_found" };
  const problems = departmentPublishProblems({ ...d, content_fr: sanitizeDoc(d.content_fr), content_en: sanitizeDoc(d.content_en) });
  if (problems.length) return { ok: false, error: "incomplete", problems };
  const { error } = await ctx.supabase.from("departments").update({ status: "published", updated_by: ctx.profile.id }).eq("id", id);
  if (error) return { ok: false, error: "update_failed" };
  revalidateTeamPages(d.slug);
  return { ok: true };
}

export async function unpublishDepartment(id: string): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const { data, error } = await ctx.supabase
    .from("departments")
    .update({ status: "draft", updated_by: ctx.profile.id })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  revalidateTeamPages(data.slug);
  return { ok: true };
}

// ───────── Delete (with its photos) ─────────

export async function deleteDepartment(id: string): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };
  const [{ data: d }, { data: media }, { data: members }] = await Promise.all([
    ctx.supabase.from("departments").select("slug, leader_photo_url").eq("id", id).maybeSingle(),
    ctx.supabase.from("department_media").select("storage_path").eq("department_id", id),
    ctx.supabase.from("department_members").select("photo_url").eq("department_id", id),
  ]);
  if (!d) return { ok: false, error: "not_found" };
  const { error } = await ctx.supabase.from("departments").delete().eq("id", id);
  if (error) return { ok: false, error: "delete_failed" };
  // Rows are gone (cascade), so every file under this department is now unused.
  await removeFiles(ctx.supabase, [
    ...(media ?? []).map((row) => row.storage_path as string | null),
    ...(members ?? []).map((row) => teamStoragePath(row.photo_url as string | null)),
    teamStoragePath(d.leader_photo_url),
  ]);
  revalidateTeamPages(d.slug);
  return { ok: true };
}

// ───────── Team photos (department_media) ─────────

async function departmentSlug(supabase: ServerClient, id: string) {
  const { data } = await supabase.from("departments").select("slug").eq("id", id).maybeSingle();
  return data?.slug as string | undefined;
}

const mediaSchema = z.object({
  path: z.string().max(300),
  width: z.number().int().positive().max(20000).nullable().optional(),
  height: z.number().int().positive().max(20000).nullable().optional(),
  size: z.number().int().positive().max(60 * 1024 * 1024),
  alt: optionalText(300),
});

/** Records a photo the browser just uploaded to `team/departments/{id}/gallery/…`. */
export async function registerDepartmentMedia(
  departmentId: string,
  input: z.input<typeof mediaSchema>,
): Promise<Result<{ media: { id: string; url: string } }>> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(departmentId)) return { ok: false, error: "invalid" };
  const parsed = mediaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const m = parsed.data;
  if (!new RegExp(`^team/departments/${departmentId}/gallery/[A-Za-z0-9_.-]+$`).test(m.path)) return { ok: false, error: "invalid" };

  const { data: last } = await ctx.supabase
    .from("department_media")
    .select("sort_order")
    .eq("department_id", departmentId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const url = ctx.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(m.path).data.publicUrl;
  const { data, error } = await ctx.supabase
    .from("department_media")
    .insert({
      department_id: departmentId,
      url,
      storage_path: m.path,
      width: m.width ?? null,
      height: m.height ?? null,
      size_bytes: m.size,
      alt: m.alt,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id, url")
    .single();
  if (error || !data) return { ok: false, error: "create_failed" };
  revalidateTeamPages(await departmentSlug(ctx.supabase, departmentId));
  return { ok: true, media: data };
}

export async function updateDepartmentMediaAlt(mediaId: string, alt: string): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(mediaId) || typeof alt !== "string") return { ok: false, error: "invalid" };
  const clean = alt.trim().slice(0, 300) || null;
  const { data, error } = await ctx.supabase
    .from("department_media")
    .update({ alt: clean })
    .eq("id", mediaId)
    .select("department_id, url")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  // The header image describes itself with the same text.
  await ctx.supabase.from("departments").update({ cover_alt: clean?.slice(0, 200) ?? null }).eq("id", data.department_id).eq("cover_url", data.url);
  revalidateTeamPages(await departmentSlug(ctx.supabase, data.department_id));
  return { ok: true };
}

/** Removes a team photo (and its file). Clears it as page header if it was. */
export async function deleteDepartmentMedia(mediaId: string): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(mediaId)) return { ok: false, error: "invalid" };
  const { data: media } = await ctx.supabase
    .from("department_media")
    .select("department_id, url, storage_path")
    .eq("id", mediaId)
    .maybeSingle();
  if (!media) return { ok: false, error: "not_found" };
  const { error } = await ctx.supabase.from("department_media").delete().eq("id", mediaId);
  if (error) return { ok: false, error: "delete_failed" };
  await ctx.supabase.from("departments").update({ cover_url: null, cover_alt: null }).eq("id", media.department_id).eq("cover_url", media.url);
  await removeFiles(ctx.supabase, [media.storage_path]);
  revalidateTeamPages(await departmentSlug(ctx.supabase, media.department_id));
  return { ok: true };
}

/** Uses a team photo as the page header (or clears it with mediaId = null). */
export async function setDepartmentCover(departmentId: string, mediaId: string | null): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(departmentId) || (mediaId !== null && !isUuid(mediaId))) return { ok: false, error: "invalid" };
  let patch: Record<string, unknown> = { cover_url: null, cover_alt: null, cover_focus: { x: 50, y: 50 } };
  if (mediaId) {
    const { data: media } = await ctx.supabase
      .from("department_media")
      .select("url, alt")
      .eq("id", mediaId)
      .eq("department_id", departmentId)
      .maybeSingle();
    if (!media || !isOwnMedia(media.url, mediaBaseUrl())) return { ok: false, error: "image_invalid" };
    patch = { cover_url: media.url, cover_alt: media.alt, cover_focus: { x: 50, y: 50 } };
  }
  const { data, error } = await ctx.supabase
    .from("departments")
    .update({ ...patch, updated_by: ctx.profile.id })
    .eq("id", departmentId)
    .select("slug")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  revalidateTeamPages(data.slug);
  return { ok: true };
}

export async function setGalleryMode(departmentId: string, mode: string): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(departmentId) || !GALLERY_MODES.includes(mode as never)) return { ok: false, error: "invalid" };
  const { data, error } = await ctx.supabase
    .from("departments")
    .update({ gallery_mode: mode, updated_by: ctx.profile.id })
    .eq("id", departmentId)
    .select("slug")
    .single();
  if (error || !data) return { ok: false, error: "update_failed" };
  revalidateTeamPages(data.slug);
  return { ok: true };
}

// ───────── Members: name + photo ─────────

const memberSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  photo_url: z.string().nullable().optional(),
  photo_focus: z.unknown().optional(),
});

export type MemberInput = z.input<typeof memberSchema>;

export async function addDepartmentMember(departmentId: string, input: MemberInput): Promise<Result<{ id: string }>> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(departmentId)) return { ok: false, error: "invalid" };
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const photo = parsed.data.photo_url || null;
  if (photo && !validPhoto(photo)) return { ok: false, error: "image_invalid" };
  const { data: last } = await ctx.supabase
    .from("department_members")
    .select("sort_order")
    .eq("department_id", departmentId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await ctx.supabase
    .from("department_members")
    .insert({
      department_id: departmentId,
      full_name: parsed.data.full_name,
      photo_url: photo,
      photo_focus: parseFocus(parsed.data.photo_focus),
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "create_failed" };
  revalidateTeamPages(await departmentSlug(ctx.supabase, departmentId));
  return { ok: true, id: data.id };
}

export async function updateDepartmentMember(memberId: string, input: MemberInput): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(memberId)) return { ok: false, error: "invalid" };
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const photo = parsed.data.photo_url || null;
  if (photo && !validPhoto(photo)) return { ok: false, error: "image_invalid" };
  const { data: before } = await ctx.supabase.from("department_members").select("department_id, photo_url").eq("id", memberId).maybeSingle();
  if (!before) return { ok: false, error: "not_found" };
  const { error } = await ctx.supabase
    .from("department_members")
    .update({ full_name: parsed.data.full_name, photo_url: photo, photo_focus: parseFocus(parsed.data.photo_focus) })
    .eq("id", memberId);
  if (error) return { ok: false, error: "update_failed" };
  await removeReplacedPhoto(ctx.supabase, before.photo_url, photo);
  revalidateTeamPages(await departmentSlug(ctx.supabase, before.department_id));
  return { ok: true };
}

export async function deleteDepartmentMember(memberId: string): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(memberId)) return { ok: false, error: "invalid" };
  const { data: before } = await ctx.supabase.from("department_members").select("department_id, photo_url").eq("id", memberId).maybeSingle();
  if (!before) return { ok: false, error: "not_found" };
  const { error } = await ctx.supabase.from("department_members").delete().eq("id", memberId);
  if (error) return { ok: false, error: "delete_failed" };
  await removeFiles(ctx.supabase, [teamStoragePath(before.photo_url)]);
  revalidateTeamPages(await departmentSlug(ctx.supabase, before.department_id));
  return { ok: true };
}

export async function reorderDepartmentMembers(departmentId: string, ids: string[]): Promise<Result> {
  const ctx = await requireTeam();
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isUuid(departmentId) || !idList(ids, 300)) return { ok: false, error: "invalid" };
  const { error } = await ctx.supabase.rpc("reorder_department_members", { ids });
  if (error) return { ok: false, error: "update_failed" };
  revalidateTeamPages(await departmentSlug(ctx.supabase, departmentId));
  return { ok: true };
}
