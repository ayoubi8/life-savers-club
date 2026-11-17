import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getPeople, listAudit, type AuditEntry } from "@/lib/finance/queries";
import { formatDzd } from "@/lib/finance/schema";

// Columns that change on every save and say nothing to a reader.
const NOISE = new Set(["updated_at", "updated_by", "created_at", "created_by", "gsheet_id", "gsheet_account_id", "gsheet_synced_at", "id", "year_id", "operation_id", "position", "total"]);

export default async function FinanceHistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { profile }] = await Promise.all([getTranslations({ locale, namespace: "adminFinance" }), getSessionProfile()]);
  if (!isAdmin(profile)) return redirect({ href: "/admin/finance", locale });

  const supabase = await createClient();
  const entries = await listAudit(supabase, 400);
  const people = await getPeople(supabase, entries.map((entry) => entry.changed_by));
  const dateFormat = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });

  const show = (key: string, value: unknown) => {
    if (value == null || value === "") return "—";
    if (["opening_balance", "unit_price", "adjustment_amount"].includes(key)) return formatDzd(Number(value), locale);
    return String(value);
  };

  function describe(entry: AuditEntry) {
    const row = entry.new_row ?? entry.old_row ?? {};
    const subject =
      entry.table_name === "finance_lines"
        ? `${row.product} · ${row.quantity} × ${show("unit_price", row.unit_price)}`
        : entry.table_name === "finance_years"
          ? String(row.label ?? "")
          : entry.table_name === "finance_sheets"
            ? String(row.name ?? "")
            : String(row.label ?? "");
    const changes =
      entry.action === "update" && entry.old_row && entry.new_row
        ? Object.keys(entry.new_row)
            .filter((key) => !NOISE.has(key) && JSON.stringify(entry.old_row![key]) !== JSON.stringify(entry.new_row![key]))
            .map((key) => ({ key, from: show(key, entry.old_row![key]), to: show(key, entry.new_row![key]) }))
        : [];
    return { subject, changes };
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/finance" className="inline-flex items-center gap-1 text-sm font-bold text-blue hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("title")}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-blue">{t("history.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("history.subtitle")}</p>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("history.none")}</p>
      ) : (
        <ol className="mt-6 divide-y divide-border rounded-card border border-border bg-white">
          {entries.map((entry) => {
            const { subject, changes } = describe(entry);
            if (entry.action === "update" && changes.length === 0) return null;
            return (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-bold text-ink">{(entry.changed_by && people[entry.changed_by]) || t("history.system")}</span>
                  <span className="text-grey">{t(`history.actions.${entry.action}`)}</span>
                  <span className="text-muted-foreground">{t(`history.tables.${entry.table_name}`)}</span>
                  <span className="font-semibold text-ink">{subject}</span>
                  <time className="ml-auto text-xs text-muted-foreground" dateTime={entry.changed_at}>
                    {dateFormat.format(new Date(entry.changed_at))}
                  </time>
                </p>
                {changes.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-grey">
                    {changes.map((change) => (
                      <li key={change.key}>
                        <span className="font-semibold">{t.has(`history.fields.${change.key}`) ? t(`history.fields.${change.key}`) : change.key}</span>:{" "}
                        <span className="line-through opacity-70">{change.from}</span> → <span>{change.to}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
