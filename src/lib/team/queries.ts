import { cache } from "react";
import { getSessionProfile } from "@/lib/auth";
import { sanitizeDoc } from "@/lib/events/content";
import { parseFocus } from "@/lib/events/utils";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { BureauMember, DepartmentCard, DepartmentFull, DepartmentMedia, DepartmentMember } from "./types";
import { CARD_COLUMNS, parseGalleryMode, sortBureau, toBureauMember, toDepartmentCard } from "./utils";

/**
 * Public queries filter on `status = 'published'` / `is_visible` explicitly: RLS also lets
 * admins read drafts, and a signed-in admin must see the same public page as visitors.
 */

const BUREAU_COLUMNS = "id, position, full_name, role_title_fr, role_title_en, bio_fr, bio_en, photo_url, photo_focus, is_visible";

async function loadBureau(onlyVisible: boolean): Promise<BureauMember[]> {
  const supabase = await createClient();
  let query = supabase.from("team_members").select(BUREAU_COLUMNS).in("position", ["president", "vice_president"]);
  if (onlyVisible) query = query.eq("is_visible", true);
  const { data } = await query;
  return sortBureau((data ?? []).map((row) => toBureauMember(row as Record<string, unknown>)).filter((m): m is BureauMember => !!m));
}

/** President and vice-president shown on /team. */
export const getBureau = cache(() => loadBureau(true));

/** Admin: both rows, hidden or not. */
export const getBureauForAdmin = cache(() => loadBureau(false));

/** Published departments in their /team order. */
export const getPublishedDepartments = cache(async (): Promise<DepartmentCard[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => toDepartmentCard(row as Record<string, unknown>));
});

/** Admin list: every department, drafts included. */
export const getAllDepartmentsForAdmin = cache(async (): Promise<(DepartmentCard & { updated_at: string })[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select(`${CARD_COLUMNS}, updated_at`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => ({ ...toDepartmentCard(row as Record<string, unknown>), updated_at: String((row as { updated_at: string }).updated_at) }));
});

const FULL_COLUMNS = `${CARD_COLUMNS}, content_fr, content_en, leader_role_fr, leader_role_en, leader_bio_fr, leader_bio_en, cover_url, cover_alt, cover_focus, gallery_mode, updated_at`;

async function loadChildren(departmentId: string): Promise<{ media: DepartmentMedia[]; members: DepartmentMember[] }> {
  const supabase = await createClient();
  const [media, members] = await Promise.all([
    supabase
      .from("department_media")
      .select("id, url, storage_path, width, height, size_bytes, alt, caption, sort_order")
      .eq("department_id", departmentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("department_members")
      .select("id, full_name, photo_url, photo_focus, sort_order")
      .eq("department_id", departmentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  return {
    media: (media.data ?? []) as DepartmentMedia[],
    members: (members.data ?? []).map((row) => ({ ...(row as DepartmentMember), photo_focus: parseFocus(row.photo_focus) })),
  };
}

function toFull(row: Record<string, unknown>, children: { media: DepartmentMedia[]; members: DepartmentMember[] }): DepartmentFull {
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  return {
    ...toDepartmentCard(row),
    content_fr: sanitizeDoc(row.content_fr),
    content_en: sanitizeDoc(row.content_en),
    leader_role_fr: text(row.leader_role_fr),
    leader_role_en: text(row.leader_role_en),
    leader_bio_fr: text(row.leader_bio_fr),
    leader_bio_en: text(row.leader_bio_en),
    cover_url: text(row.cover_url),
    cover_alt: text(row.cover_alt),
    cover_focus: parseFocus(row.cover_focus),
    gallery_mode: parseGalleryMode(row.gallery_mode),
    updated_at: String(row.updated_at),
    ...children,
  };
}

/** Department page. Drafts are returned only to active admins (`preview: true`). */
export const getDepartmentBySlug = cache(async (slug: string): Promise<{ department: DepartmentFull; preview: boolean } | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("departments").select(FULL_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  let preview = false;
  if (row.status !== "published") {
    const { profile } = await getSessionProfile();
    if (!isAdmin(profile)) return null;
    preview = true;
  }
  return { department: toFull(row, await loadChildren(String(row.id))), preview };
});

/** Admin editor: any status (RLS restricts drafts to admins). */
export const getDepartmentForAdmin = cache(async (id: string): Promise<DepartmentFull | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [{ data }, children] = await Promise.all([
    supabase.from("departments").select(FULL_COLUMNS).eq("id", id).maybeSingle(),
    loadChildren(id),
  ]);
  return data ? toFull(data as unknown as Record<string, unknown>, children) : null;
});
