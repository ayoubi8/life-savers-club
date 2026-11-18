import { ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllDepartmentsForAdmin, getBureauForAdmin } from "@/lib/team/queries";
import { BureauEditor } from "./bureau-editor";
import { DepartmentsList } from "./departments-list";
import { NewDepartment } from "./new-department";

export default async function TeamAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, bureau, departments] = await Promise.all([
    getTranslations({ locale, namespace: "adminTeam" }),
    getBureauForAdmin(),
    getAllDepartmentsForAdmin(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-blue">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <a
          data-tour="team.view"
          href={`/${locale}/team`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t("viewPage")}
        </a>
      </div>

      <section data-tour="team.bureau" aria-labelledby="bureau-heading">
        <h2 id="bureau-heading" className="text-lg font-extrabold text-grey">{t("bureau.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("bureau.subtitle")}</p>
        {bureau.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {bureau.map((member) => (
              <BureauEditor key={member.id} member={member} />
            ))}
          </div>
        ) : (
          <p role="alert" className="mt-4 rounded-xl border border-pink/30 bg-pink/5 p-4 text-sm text-grey">{t("bureau.missing")}</p>
        )}
      </section>

      <section aria-labelledby="departments-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="departments-heading" className="text-lg font-extrabold text-grey">{t("list.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("list.subtitle")}</p>
          </div>
          <NewDepartment />
        </div>
        <div data-tour="team.departments" className="mt-4">
          <DepartmentsList items={departments} locale={locale} />
        </div>
      </section>
    </div>
  );
}
