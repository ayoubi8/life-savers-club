import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid, parseSchema } from "@/lib/forms/schema";
import { googleRedirectUri, isGoogleConfigured } from "@/lib/google/config";
import { encryptSecret, verifyState } from "@/lib/google/crypto";
import { createSpreadsheet, exchangeCode, writeHeaderRow } from "@/lib/google/sheets";

type OAuthState = {
  formId: string;
  userId: string;
  locale: string;
  exp: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || url.origin).replace(/\/+$/, "");
  const state = verifyState<OAuthState>(url.searchParams.get("state") ?? "");
  const locale = state?.locale ?? "fr";
  const formId = state?.formId ?? "";

  const back = (key: string, value: string) => {
    const path = formId ? `/${locale}/admin/forms/${formId}/integrations` : `/${locale}/admin/forms`;
    const destination = new URL(path, origin);
    destination.searchParams.set(key, value);
    return NextResponse.redirect(destination);
  };

  if (url.searchParams.get("error")) return back("error", "denied");
  if (!state || !isUuid(state.formId)) return back("error", "invalid_state");
  if (!isGoogleConfigured()) return back("error", "not_configured");

  const code = url.searchParams.get("code");
  if (!code) return back("error", "missing_code");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, origin));
  }
  if (auth.user.id !== state.userId) return back("error", "invalid_user");

  try {
    const tokens = await exchangeCode(code, googleRedirectUri(origin));
    if (!tokens.refresh_token) return back("error", "no_refresh_token");

    const admin = createAdminClient();
    if (!admin) return back("error", "not_configured");

    const { error: connectionError } = await admin.from("google_connections").upsert(
      {
        user_id: auth.user.id,
        refresh_token_enc: encryptSecret(tokens.refresh_token),
        scopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.file",
        ],
      },
      { onConflict: "user_id" },
    );
    if (connectionError) return back("error", "connection_failed");

    const { data: form } = await supabase
      .from("forms")
      .select("id, title, schema")
      .eq("id", state.formId)
      .maybeSingle();
    if (!form) return back("error", "invalid_form");

    const schema = parseSchema(form.schema);
    const sheetId = await createSpreadsheet(`Life Savers – ${form.title}`, tokens.access_token);
    await writeHeaderRow(sheetId, tokens.access_token, schema);

    const { error: updateError } = await supabase
      .from("forms")
      .update({ sheet_id: sheetId, sheet_owner: auth.user.id })
      .eq("id", form.id);
    if (updateError) return back("error", "link_failed");

    return back("connected", "1");
  } catch {
    return back("error", "google_failed");
  }
}
