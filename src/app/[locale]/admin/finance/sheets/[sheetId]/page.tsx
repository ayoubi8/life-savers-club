import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Download, ExternalLink, FileSpreadsheet, Lock } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getPeople, getSheet, listSheetOperations } from "@/lib/finance/queries";
import { formatDzd } from "@/lib/finance/schema";
import { cn } from "@/lib/utils";
import { SheetMenu } from "../../year-client";
import { Ledger } from "./ledger";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KNOWN_ERRORS = new Set(["invalid", "not_found", "drive_disconnected", "not_google_account", "google_forbidden", "google_failed", "sheets_api_disabled"]);

export default async function FinanceSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; sheetId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, sheetId } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const [t, { profile }] = await Promise.all([getTranslations({ locale, namespace: "adminFinance" }), getSessionProfile()]);
  if (!can(profile, "finance")) return redirect({ href: "/admin", locale });
  if (!UUID.test(sheetId)) notFound();

  const supabase = await createClient();
  const [sheet, rows] = await Promise.all([getSheet(supabase, sheetId), listSheetOperations(supabase, sheetId)]);
  if (!sheet) notFound();
  const [{ data: year }, people] = await Promise.all([
    supabase.from("finance_years").select("label, status").eq("id", sheet.year_id).maybeSingle(),
    getPeople(supabase, [...rows.map((row) => row.created_by), sheet.created_by]),
  ]);

  const admin = isAdmin(profile);
  const yearOpen = year?.status === "open";
  const locked = !!sheet.locked_at;
  const writable = yearOpen && !sheet.archived_at && !locked;
  const error = typeof query.error === "string" && KNOWN_ERRORS.has(query.error) ? query.error : null;
  const net = sheet.received - sheet.spent;

  return (
    <div className="mx-auto max-w-7xl">
      <Link href={{ pathname: "/admin/finance", query: { year: sheet.year_id } }} className="inline-flex items-center gap-1 text-sm font-bold text-blue hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("sheets.back", { label: (year?.label as string) ?? "" })}
      </Link>

      <header className="mb-5 mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="break-words text-2xl font-extrabold text-blue">{sheet.name}</h1>
            {locked && <Lock className="h-5 w-5 shrink-0 text-grey" aria-label={t("sheets.lockedBadge")} />}
            {yearOpen && (admin || (sheet.created_by === profile!.id && !locked)) && (
              <SheetMenu
                admin={admin}
                sheet={{ id: sheet.id, name: sheet.name, description: sheet.description, archived: !!sheet.archived_at, locked }}
              />
            )}
          </div>
          {sheet.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{sheet.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {t("sheets.by", { name: (sheet.created_by && people[sheet.created_by]) || "—" })}
            {sheet.archived_at && ` · ${t("sheets.archivedBadge")}`}
            {!yearOpen && ` · ${t("year.statusClosed")}`}
          </p>
        </div>
        <div data-tour="sheet.export" className="flex flex-wrap gap-2">
          <a href={`/api/finance/open?sheet=${sheet.id}&locale=${locale}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-grey hover:bg-muted">
            <FileSpreadsheet className="h-4 w-4 text-green" aria-hidden />
            {t("google.open")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          <a href={`/api/finance/export?sheet=${sheet.id}&locale=${locale}&format=xlsx`} className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-grey hover:bg-muted">
            <Download className="h-4 w-4" aria-hidden />
            {t("download.xlsx")}
          </a>
          <a href={`/api/finance/export?sheet=${sheet.id}&locale=${locale}&format=csv`} className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-grey hover:bg-muted">
            <Download className="h-4 w-4" aria-hidden />
            {t("download.csv")}
          </a>
        </div>
      </header>

      {locked && (
        <p data-tour="sheet.locked" role="status" className="mb-4 flex items-center gap-2 rounded-card border border-border bg-white px-4 py-3 text-sm font-semibold text-grey">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          {admin ? t("sheets.lockedBannerAdmin") : t("sheets.lockedBanner")}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-card border border-pink/30 bg-pink/5 px-4 py-3 text-sm font-semibold text-pink">
          {t(`errors.${error}`)}
        </p>
      )}

      <dl className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { key: "received", value: sheet.received, color: "text-green" },
          { key: "spent", value: sheet.spent, color: "text-pink" },
          { key: "net", value: net, color: net < 0 ? "text-pink" : "text-ink" },
        ].map((item) => (
          <div key={item.key} className="rounded-card border border-border bg-white p-4">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t(`totals.${item.key}`)}</dt>
            <dd className={cn("mt-1 text-lg font-extrabold", item.color)}>{formatDzd(item.value, locale, { sign: item.key === "net" })}</dd>
          </div>
        ))}
      </dl>

      <Ledger sheetId={sheet.id} rows={rows} people={people} viewer={{ id: profile!.id, admin }} writable={writable} />
    </div>
  );
}
