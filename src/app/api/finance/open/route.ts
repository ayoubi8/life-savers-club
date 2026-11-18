import { NextResponse } from "next/server";
import { requireSection } from "@/lib/auth";
import { DriveError } from "@/lib/google/drive";
import { openInGoogleSheets, type FinanceTarget } from "@/lib/finance/gsheets";
import { DriveDisconnectedError } from "@/lib/media/drive-token";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Open in Google Sheets": refreshes the Google copy of a sheet (?sheet=) or of the year (?year=),
 * shares it as view-only with the member's Gmail, and sends the browser there.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fr";
  const sheet = url.searchParams.get("sheet");
  const year = url.searchParams.get("year");
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || url.origin).replace(/\/+$/, "");
  const page = sheet ? `/${locale}/admin/finance/sheets/${sheet}` : `/${locale}/admin/finance${year ? `?year=${year}` : ""}`;
  const back = (error: string) => {
    const destination = new URL(page, origin);
    destination.searchParams.set("error", error);
    return NextResponse.redirect(destination);
  };

  const target: FinanceTarget | null = sheet && UUID.test(sheet) ? { kind: "sheet", id: sheet } : year && UUID.test(year) ? { kind: "year", id: year } : null;
  if (!target) return back("invalid");

  const ctx = await requireSection("finance");
  if (!ctx) return NextResponse.redirect(new URL(`/${locale}/admin`, origin));

  // Readable by this member (RLS), and get the Gmail they chose.
  const [{ data: visible }, { data: me }] = await Promise.all([
    ctx.supabase.from(target.kind === "sheet" ? "finance_sheets" : "finance_years").select("id").eq("id", target.id).maybeSingle(),
    ctx.supabase.from("profiles").select("email, google_share_email").eq("id", ctx.profile.id).maybeSingle(),
  ]);
  if (!visible) return back("not_found");
  const email = (me?.google_share_email as string | null) || (me?.email as string) || ctx.profile.email;

  try {
    return NextResponse.redirect(await openInGoogleSheets(target, { id: ctx.profile.id, email }));
  } catch (error) {
    if (error instanceof DriveDisconnectedError) return back("drive_disconnected");
    if (error instanceof DriveError && error.reason === "SERVICE_DISABLED") return back("sheets_api_disabled");
    if (error instanceof DriveError && error.status === 400) return back("not_google_account");
    if (error instanceof DriveError && error.status === 403) return back("google_forbidden");
    return back("google_failed");
  }
}
