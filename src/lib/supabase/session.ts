import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/** True when the request carries a Supabase auth cookie (possibly chunked: `.0`, `.1`, …). */
export function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

/**
 * Refreshes the Supabase auth cookies on `response` when the access token expired,
 * and returns the signed-in user id.
 *
 * `getClaims()` verifies the JWT locally against the project's cached public key
 * (ES256), so a valid session costs no network call. It only reaches Supabase to
 * refresh an expired token or to fetch the key set once.
 */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}
