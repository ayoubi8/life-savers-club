import { getTranslations, setRequestLocale } from "next-intl/server";
import { Archive, Download, ExternalLink, FileSpreadsheet, History, Lock } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  balanceSeries,
  categoryTotals,
  getPeople,
  getYearTotals,
  listSheets,
  listYearOperations,
  listYears,
  pickYear,
} from "@/lib/finance/queries";
import { formatDzd } from "@/lib/finance/schema";
import { cn } from "@/lib/utils";
import { BalanceChart, CategoryBars } from "./balance-chart";
import { CancelAdjustmentButton } from "./adjustment-client";
import { NewSheetButton, OpenYearButton, SheetMenu, ShareEmailSetting, YearAdminActions } from "./year-client";

const KNOWN_ERRORS = new Set(["invalid", "not_found", "drive_disconnected", "not_google_account", "google_forbidden", "google_failed", "sheets_api_disabled"]);

function suggestedLabel() {
  const now = new Date();
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1; // the club year starts in September
  return `${start}-${start + 1}`;
}

export default async function FinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const [t, { profile }] = await Promise.all([getTranslations({ locale, namespace: "adminFinance" }), getSessionProfile()]);
  if (!can(profile, "finance")) return redirect({ href: "/admin", locale });
  const admin = isAdmin(profile);
  const supabase = await createClient();

  const years = await listYears(supabase);
  const year = pickYear(years, typeof query.year === "string" ? query.year : null);
  const hasOpenYear = years.some((item) => item.status === "open");
  const error = typeof query.error === "string" && KNOWN_ERRORS.has(query.error) ? query.error : null;

  if (!year) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-extrabold text-blue">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        <section data-tour="finance.no-year" className="mt-6 max-w-xl rounded-card border border-dashed border-border bg-white p-6">
          <h2 className="font-extrabold text-grey">{t("year.noneTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{admin ? t("year.noneAdmin") : t("year.noneMember")}</p>
          {admin && (
            <div className="mt-4">
              <OpenYearButton suggestedLabel={suggestedLabel()} />
            </div>
          )}
        </section>
      </div>
    );
  }

  const archived = query.archived === "1";
  const [totals, sheets, operations, { data: me }] = await Promise.all([
    getYearTotals(supabase, year.id),
    listSheets(supabase, year.id, archived),
    listYearOperations(supabase, year.id),
    supabase.from("profiles").select("email, google_share_email").eq("id", profile!.id).maybeSingle(),
  ]);
  const people = await getPeople(supabase, [...operations.map((row) => row.created_by), ...sheets.map((sheet) => sheet.created_by)]);
  const sheetNames = new Map(sheets.map((sheet) => [sheet.id, sheet.name]));
  const recent = [...operations].reverse().filter((row) => row.kind !== "adjustment").slice(0, 8);
  const adjustments = operations.filter((row) => row.kind === "adjustment").reverse();
  const open = year.status === "open";
  const yearQuery = `year=${year.id}&locale=${locale}`;

  const stats = [
    { key: "balance", value: totals.balance, strong: true },
    { key: "opening", value: totals.opening_balance },
    { key: "received", value: totals.received },
    { key: "spent", value: totals.spent },
    ...(totals.adjustments ? [{ key: "adjustments", value: totals.adjustments }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-blue">{t("title")}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {t("year.current", { label: year.label })}
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", open ? "bg-green/10 text-green" : "bg-grey/10 text-grey")}>
              {open ? t("year.statusOpen") : t("year.statusClosed")}
            </span>
          </p>
        </div>
        <div data-tour="finance.google" className="flex flex-wrap gap-2">
          <a href={`/api/finance/open?${yearQuery}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-grey hover:bg-muted">
            <FileSpreadsheet className="h-4 w-4 text-green" aria-hidden />
            {t("google.open")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          <a href={`/api/finance/export?${yearQuery}&format=xlsx`} className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-grey hover:bg-muted">
            <Download className="h-4 w-4" aria-hidden />
            {t("download.xlsx")}
          </a>
          {admin && (
            <Link href="/admin/finance/history" className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-grey hover:bg-muted">
              <History className="h-4 w-4" aria-hidden />
              {t("history.title")}
            </Link>
          )}
        </div>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-card border border-pink/30 bg-pink/5 px-4 py-3 text-sm font-semibold text-pink">
          {t(`errors.${error}`)}
        </p>
      )}

      <div data-tour="finance.share-email" className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ShareEmailSetting current={(me?.google_share_email as string | null) ?? null} accountEmail={(me?.email as string) ?? profile!.email} />
        {years.length > 1 && (
          <nav aria-label={t("year.switch")} className="flex flex-wrap gap-1.5">
            {years.map((item) => (
              <Link
                key={item.id}
                href={{ pathname: "/admin/finance", query: { year: item.id } }}
                className={cn("rounded-full px-3 py-1 text-xs font-bold", item.id === year.id ? "bg-blue text-white" : "border border-border bg-white text-grey")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {admin && (
        <div data-tour="finance.year-actions" className="mb-6 flex flex-wrap items-center gap-2">
          <YearAdminActions year={year} />
          {!hasOpenYear && <OpenYearButton suggestedLabel={suggestedLabel()} />}
        </div>
      )}

      <section data-tour="finance.totals" aria-label={t("totals.title")} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.key} className={cn("rounded-card border bg-white p-4", stat.strong ? "border-blue sm:col-span-2 lg:col-span-1" : "border-border")}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t(`totals.${stat.key}`)}</p>
            <p className={cn("mt-1 font-extrabold", stat.strong ? "text-2xl" : "text-lg", stat.value < 0 ? "text-pink" : stat.strong ? "text-blue" : "text-ink")}>
              {formatDzd(stat.value, locale)}
            </p>
          </div>
        ))}
      </section>

      <div data-tour="finance.charts" className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BalanceChart points={balanceSeries(operations, totals.opening_balance, year.starts_on)} locale={locale} label={t("chart.balance")} />
        </div>
        <div className="space-y-4">
          <CategoryBars
            title={t("chart.spentBy")}
            locale={locale}
            color="bg-pink"
            items={categoryTotals(operations, "expense").map((item) => ({ label: t(`categories.${item.category}`), amount: item.amount }))}
          />
          <CategoryBars
            title={t("chart.receivedFrom")}
            locale={locale}
            color="bg-green"
            items={categoryTotals(operations, "income").map((item) => ({ label: t(`categories.${item.category}`), amount: item.amount }))}
          />
        </div>
      </div>

      <section data-tour="finance.sheets" className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-grey">{archived ? t("sheets.archivedTitle") : t("sheets.title")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={{ pathname: "/admin/finance", query: { year: year.id, ...(archived ? {} : { archived: "1" }) } }}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue hover:underline"
            >
              <Archive className="h-4 w-4" aria-hidden />
              {archived ? t("sheets.showActive") : t("sheets.showArchived")}
            </Link>
            {open && !archived && <NewSheetButton yearId={year.id} />}
          </div>
        </div>
        {sheets.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            {archived ? t("sheets.noneArchived") : t("sheets.none")}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sheets.map((sheet) => {
              const mine = sheet.created_by === profile!.id;
              return (
                <li key={sheet.id} className="relative rounded-card border border-border bg-white transition hover:border-blue">
                  <Link href={`/admin/finance/sheets/${sheet.id}`} className="block p-4 pr-12">
                    <h3 className="flex items-center gap-1.5 truncate font-bold text-grey">
                      {sheet.locked_at && <Lock className="h-4 w-4 shrink-0 text-grey" aria-label={t("sheets.lockedBadge")} />}
                      <span className="truncate">{sheet.name}</span>
                    </h3>
                    {sheet.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{sheet.description}</p>}
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground">{t("totals.received")}</dt>
                        <dd className="font-bold text-green">{formatDzd(sheet.received, locale)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("totals.spent")}</dt>
                        <dd className="font-bold text-pink">{formatDzd(sheet.spent, locale)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("sheets.operations")}</dt>
                        <dd className="font-bold text-ink">{sheet.operations}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("sheets.by", { name: (sheet.created_by && people[sheet.created_by]) || "—" })}
                    </p>
                  </Link>
                  {open && (admin || (mine && !sheet.locked_at)) && (
                    <div className="absolute right-2 top-3">
                      <SheetMenu
                        admin={admin}
                        sheet={{ id: sheet.id, name: sheet.name, description: sheet.description, archived: !!sheet.archived_at, locked: !!sheet.locked_at }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section data-tour="finance.recent">
          <h2 className="mb-3 text-lg font-extrabold text-grey">{t("recent.title")}</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("recent.none")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-white">
              {recent.map((row) => (
                <li key={row.id} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", row.cancelled_at && "opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-semibold text-ink", row.cancelled_at && "line-through")}>{row.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.occurred_on} · {(row.sheet_id && sheetNames.get(row.sheet_id)) || "—"} · {(row.created_by && people[row.created_by]) || ""}
                    </p>
                  </div>
                  <span className={cn("shrink-0 font-bold", row.kind === "income" ? "text-green" : "text-pink")}>
                    {formatDzd(row.kind === "income" ? row.amount : -row.amount, locale, { sign: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-extrabold text-grey">{t("adjustments.title")}</h2>
          {adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("adjustments.none")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-white">
              {adjustments.map((row) => (
                <li key={row.id} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", row.cancelled_at && "opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-semibold text-ink", row.cancelled_at && "line-through")}>{row.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.occurred_on} · {(row.created_by && people[row.created_by]) || ""}
                      {row.cancelled_at && ` · ${t("status.cancelled")}: ${row.cancel_reason ?? ""}`}
                    </p>
                  </div>
                  <span className={cn("shrink-0 font-bold", row.amount >= 0 ? "text-green" : "text-pink")}>{formatDzd(row.amount, locale, { sign: true })}</span>
                  {admin && open && !row.cancelled_at && <CancelAdjustmentButton id={row.id} />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
