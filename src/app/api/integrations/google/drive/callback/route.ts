import { NextResponse } from "next/server";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { about, createFolder, getFile } from "@/lib/google/drive";
import { driveRedirectUri, isGoogleConfigured } from "@/lib/google/config";
import { encryptSecret, verifyState } from "@/lib/google/crypto";
import { exchangeCode } from "@/lib/google/oauth";
import { forgetDriveToken } from "@/lib/media/drive-token";

export const runtime = "nodejs";

const ROOT_FOLDER_NAME = "Life Savers – Media";
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

type OAuthState = { purpose: string; userId: string; locale: string; exp: number };

/**
 * Google sends the admin back here. Saves the account (encrypted refresh token), makes sure its
 * root folder exists, and makes it the library's active account. An account connected before
 * keeps its folders: they show again once it is active.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || url.origin).replace(/\/+$/, "");
  const state = verifyState<OAuthState>(url.searchParams.get("state") ?? "");
  const locale = state?.locale === "en" ? "en" : "fr";

  const back = (key: "error" | "connected", value: string) => {
    const destination = new URL(`/${locale}/admin/media`, origin);
    destination.searchParams.set(key, value);
    return NextResponse.redirect(destination);
  };

  if (url.searchParams.get("error")) return back("error", "denied");
  if (!state || state.purpose !== "drive") return back("error", "invalid_state");
  if (!isGoogleConfigured()) return back("error", "not_configured");
  const code = url.searchParams.get("code");
  if (!code) return back("error", "denied");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL(`/${locale}/login`, origin));
  if (auth.user.id !== state.userId) return back("error", "invalid_state");
  if (!(await requireSection("accounts"))) return back("error", "forbidden");

  const admin = createAdminClient();
  if (!admin) return back("error", "not_configured");

  try {
    const tokens = await exchangeCode(code, driveRedirectUri(origin));
    if (!tokens.refresh_token) return back("error", "no_refresh_token");
    // Google lets people untick scopes on the consent screen.
    if (tokens.scope && !tokens.scope.split(" ").includes(DRIVE_FILE_SCOPE)) return back("error", "scope_missing");

    const email = (await about(tokens.access_token)).user?.emailAddress?.toLowerCase();
    if (!email) return back("error", "google_failed");

    const { data: existing } = await admin
      .from("drive_accounts")
      .select("id, root_folder_id")
      .eq("google_email", email)
      .maybeSingle();

    // Reuse the account's root folder when it still exists; otherwise make a new one.
    let rootFolderId = existing?.root_folder_id as string | undefined;
    if (rootFolderId) {
      const root = await getFile(tokens.access_token, rootFolderId, "id,trashed").catch(() => null);
      if (!root || root.trashed) rootFolderId = undefined;
    }
    rootFolderId ??= (await createFolder(tokens.access_token, ROOT_FOLDER_NAME)).id;

    const { data: saved, error: saveError } = await admin
      .from("drive_accounts")
      .upsert(
        {
          google_email: email,
          refresh_token_enc: encryptSecret(tokens.refresh_token),
          root_folder_id: rootFolderId,
          connected_by: auth.user.id,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "google_email" },
      )
      .select("id")
      .single();
    if (saveError || !saved) return back("error", "connection_failed");

    const { error: activateError } = await admin.rpc("activate_drive_account", { p_id: saved.id });
    if (activateError) return back("error", "connection_failed");
    forgetDriveToken(saved.id as string);

    return back("connected", "1");
  } catch {
    return back("error", "google_failed");
  }
}
