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
  /** Guided tours finished or skipped: tour id → version. */
  tours_seen: Record<string, number> | null;
  /** The one protected owner account (see the owner_account migration). */
  is_owner?: boolean;
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

  const columns = "id, full_name, email, role, status, department, sections";
  const first = await supabase.from("profiles").select(`${columns}, tours_seen, is_owner`).eq("id", userId).maybeSingle();
  // 42703 = column missing: a newer migration is not applied yet. Never sign people out for that.
  const { data: profile } =
    first.error?.code === "42703" ? await supabase.from("profiles").select(columns).eq("id", userId).maybeSingle() : first;
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
