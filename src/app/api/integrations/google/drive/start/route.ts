import { NextResponse } from "next/server";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { driveRedirectUri, isGoogleConfigured } from "@/lib/google/config";
import { signState } from "@/lib/google/crypto";

export const runtime = "nodejs";

const DRIVE_SCOPES ="openid email https://www.googleapis.com/auth/drive.file";

/** Admins only: sends the browser to Google to pick the account that will hold the media library. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fr";
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || url.origin).replace(/\/+$/, "");

  const back = (value: string) => {
    const destination = new URL(`/${locale}/admin/media`, origin);
    destination.searchParams.set("error", value);
    return NextResponse.redirect(destination);
  };

  if (!isGoogleConfigured()) return back("not_configured");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL(`/${locale}/login`, origin));
  // "accounts" is the admin-only section: members can use the library but never change its account.
  if (!(await requireSection("accounts"))) return back("forbidden");

  const state = signState({ purpose: "drive", userId: auth.user.id, locale, exp: Date.now() + 10 * 60 * 1000 });

  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authorization.searchParams.set("redirect_uri", driveRedirectUri(origin));
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("access_type", "offline");
  // consent: always return a refresh token. select_account: let the admin pick the club account.
  authorization.searchParams.set("prompt", "consent select_account");
  authorization.searchParams.set("scope", DRIVE_SCOPES);
  authorization.searchParams.set("state", state);

  return NextResponse.redirect(authorization);
}
