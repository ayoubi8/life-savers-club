import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileText, Inbox } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { duplicateForm } from "@/lib/forms/actions";
import { createClient } from "@/lib/supabase/server";
import { NewForm } from "./new-form";
import { DeleteFormButton } from "./delete-form-button";

type FormRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  updated_at: string;
  is_template: boolean;
  responses: { count: number }[] | null;
  fresh: { count: number }[] | null;
};

const badgeClass: Record<FormRow["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green/10 text-green",
  archived: "bg-border text-muted-foreground",
};

export default async function AdminFormsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const supabase = await createClient();
  // One round trip: total responses and unopened ("new") responses are counted by
  // the database as two aliased embeds of the same relation.
  const [t, { data }] = await Promise.all([
    getTranslations({ locale, namespace: "adminForms" }),
    supabase
      .from("forms")
      .select("id, slug, title, status, updated_at, is_template, responses(count), fresh:responses(count)")
      .eq("fresh.status", "new")
      .order("updated_at", { ascending: false }),
  ]);

  const all = (data ?? []) as unknown as FormRow[];
  const forms = all.filter((form) => !form.is_template);
  const templates = all.filter((form) => form.is_template);

  // Responses nobody has opened yet, per form.
  const newCounts = new Map<string, number>(
    all.map((form) => [form.id, Number(form.fresh?.[0]?.count ?? 0)]),
  );
  const dateFormat = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-blue">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {query.saved === "template" && (
        <p role="status" className="mb-4 rounded-card border border-green/30 bg-green/5 px-4 py-3 text-sm font-semibold text-green">
          {t("templateSaved")}
        </p>
      )}
      {query.error === "duplicate_failed" && (
        <p role="alert" className="mb-4 rounded-card border border-pink/30 bg-pink/5 px-4 py-3 text-sm font-semibold text-pink">
          {t("duplicateFailed")}
        </p>
      )}

      <NewForm locale={locale} userTemplates={templates.map((item) => ({ id: item.id, title: item.title }))} />

      {forms.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-card border border-dashed border-border bg-white px-6 py-14 text-center">
          <Inbox className="h-10 w-10 text-blue/40" />
          <h2 className="mt-3 font-bold text-grey">{t("noForms")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("noFormsHint")}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {forms.map((form, index) => {
            const count = Array.isArray(form.responses)
              ? Number(form.responses[0]?.count ?? 0)
              : 0;

            return (
              <article
                key={form.id}
                data-tour={index === 0 ? "forms.card" : undefined}
                className="flex flex-col rounded-card border border-border bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/forms/${form.id}/edit`}
                      className="flex items-center gap-2 font-bold text-grey hover:text-blue"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-blue" />
                      <span className="truncate">{form.title}</span>
                    </Link>
                    <p className="mt-1 truncate text-xs text-muted-foreground">/{form.slug}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${badgeClass[form.status]}`}
                  >
                    {t(`status.${form.status}`)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{t("openCount", { count })}</span>
                  {(newCounts.get(form.id) ?? 0) > 0 && (
                    <Link
                      href={`/admin/forms/${form.id}/results?status=new`}
                      className="rounded-full bg-pink px-2.5 py-0.5 font-extrabold text-white"
                    >
                      {t("newCount", { count: newCounts.get(form.id) ?? 0 })}
                    </Link>
                  )}
                  <span>
                    {t("updated")} {dateFormat.format(new Date(form.updated_at))}
                  </span>
                </div>

                <div data-tour={index === 0 ? "forms.actions" : undefined} className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <Link
                    href={`/admin/forms/${form.id}/edit`}
                    className="rounded-full bg-blue px-4 py-1.5 text-xs font-bold text-white hover:opacity-90"
                  >
                    {t("edit")}
                  </Link>
                  <div className="flex items-center gap-1">
                    <form action={duplicateForm}>
                      <input type="hidden" name="id" value={form.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="mode" value="copy" />
                      <button className="rounded-full px-3 py-1.5 text-xs font-bold text-grey hover:bg-muted">
                        {t("duplicate")}
                      </button>
                    </form>
                    <form action={duplicateForm}>
                      <input type="hidden" name="id" value={form.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="mode" value="template" />
                      <button className="rounded-full px-3 py-1.5 text-xs font-bold text-grey hover:bg-muted">
                        {t("saveTemplate")}
                      </button>
                    </form>
                    <DeleteFormButton
                      id={form.id}
                      locale={locale}
                      label={t("delete")}
                      confirmText={t("deleteConfirm")}
                      showIcon
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {templates.length > 0 && (
        <section data-tour="forms.templates" className="mt-10">
          <h2 className="font-extrabold text-grey">{t("templatesTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("templatesHint")}</p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {templates.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-white p-4">
                <div className="min-w-0">
                  <p className="truncate font-bold text-grey">{item.title}</p>
                  <span className="mt-1 inline-block rounded-full bg-pink/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-pink">
                    {t("templateBadge")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/forms/${item.id}/edit`}
                    className="rounded-full bg-blue px-4 py-1.5 text-xs font-bold text-white hover:opacity-90"
                  >
                    {t("edit")}
                  </Link>
                  <DeleteFormButton id={item.id} locale={locale} label={t("delete")} confirmText={t("deleteConfirm")} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
