import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { SITE_KEYS, parseHomePage, parseSiteGeneral, parseSponsorsPage } from "./schema";

async function readSetting(key: string): Promise<unknown> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  return data?.value;
}

/** Header + footer content (logo, nav labels, contact, socials). */
export const getSiteGeneral = cache(async () => parseSiteGeneral(await readSetting(SITE_KEYS.general)));
export const getHomePage = cache(async () => parseHomePage(await readSetting(SITE_KEYS.home)));
export const getSponsorsPage = cache(async () => parseSponsorsPage(await readSetting(SITE_KEYS.sponsors)));
