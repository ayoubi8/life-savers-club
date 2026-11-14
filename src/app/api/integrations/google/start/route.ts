import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/forms/schema";
import { googleRedirectUri, isGoogleConfigured } from "@/lib/google/config";
import { signState } from "@/lib/google/crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const formId = url.searchParams.get("formId") ?? "";
  const locale = url.searchParams.get("locale") ?? "fr";
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || url.origin).replace(/\/+$/, "");

  const back = (key: string, value: string) => {
    const path = formId ? `/${locale}/admin/forms/${formId}/integrations` : `/${locale}/admin/forms`;
    const destination = new URL(path, origin);
    destination.searchParams.set(key, value);
    return NextResponse.redirect(destination);
  };

  if (!isUuid(formId)) return back("error", "invalid_form");
  if (!isGoogleConfigured()) return back("error", "not_configured");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.redirect(new URL(`/${locale}/login`, origin));
  }

  const state = signState({
    formId,
    userId: auth.user.id,
    locale,
    exp: Date.now() + 10 * 60 * 1000,
  });

  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authorization.searchParams.set("redirect_uri", googleRedirectUri(origin));
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("access_type", "offline");
  authorization.searchParams.set("prompt", "consent");
  authorization.searchParams.set("include_granted_scopes", "true");
  authorization.searchParams.set(
    "scope",
    "openid email https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
  );
  authorization.searchParams.set("state", state);

  return NextResponse.redirect(authorization);
}
