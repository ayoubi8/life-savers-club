import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SessionProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "leader" | "admin";
  status: "pending" | "active" | "disabled";
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
    .select("id, full_name, email, role, status")
    .eq("id", userId)
    .maybeSingle();
  return { userId, profile: (profile as SessionProfile | null) ?? null };
});
