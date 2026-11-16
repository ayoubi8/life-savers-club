"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { SITE_KEYS, parseHomePage, parseSiteGeneral, parseSponsorsPage } from "./schema";

type Result = { ok: true } | { ok: false; error: string };
const LOCALES = ["fr", "en"] as const;

/** Site pages are edited by active admins only (RLS on site_settings enforces the same rule). */
async function save(key: string, value: unknown, revalidate: () => void): Promise<Result> {
  const { profile } = await getSessionProfile();
  if (!isAdmin(profile)) return { ok: false, error: "unauthorized" };
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: "update_failed" };
  revalidate();
  return { ok: true };
}

export async function saveSiteGeneral(input: unknown): Promise<Result> {
  // Header and footer appear on every public page.
  return save(SITE_KEYS.general, parseSiteGeneral(input), () => revalidatePath("/", "layout"));
}

export async function saveHomePage(input: unknown): Promise<Result> {
  return save(SITE_KEYS.home, parseHomePage(input), () => LOCALES.forEach((locale) => revalidatePath(`/${locale}`)));
}

export async function saveSponsorsPage(input: unknown): Promise<Result> {
  return save(SITE_KEYS.sponsors, parseSponsorsPage(input), () =>
    LOCALES.forEach((locale) => revalidatePath(`/${locale}/sponsors`)),
  );
}
