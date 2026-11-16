import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { can, type Department, type Role, type Section } from "@/lib/permissions";

export type SessionProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: Role;
  status: "pending" | "active" | "disabled";
  department: Department | null;
  sections: string[];
};

/**
 * The signed-in user and their profile, fetched once per request and shared by
 * layouts, pages and server actions that render in the same request.
 *
 * The JWT is verified locally (`getClaims`), so this costs a single database round
 * trip (the profile). Authorization still happens in Postgres through RLS.
 */
export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { userId: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, department, sections")
    .eq("id", userId)
    .maybeSingle();
  return { userId, profile: (profile as SessionProfile | null) ?? null };
});

/**
 * For server actions and route handlers: the Supabase client and profile when the
 * signed-in account may use `section`, otherwise null. RLS applies the same rule.
 */
export async function requireSection(section: Section | "accounts") {
  const { profile } = await getSessionProfile();
  if (!can(profile, section)) return null;
  return { supabase: await createClient(), profile: profile! };
}
