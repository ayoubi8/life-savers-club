import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { BureauCard } from "@/components/team/bureau-card";
import { DepartmentCard } from "@/components/team/department-card";
import { getBureau, getPublishedDepartments } from "@/lib/team/queries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "team" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function TeamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, bureau, departments] = await Promise.all([
    getTranslations({ locale, namespace: "team" }),
    getBureau(),
    getPublishedDepartments(),
  ]);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6">
        {bureau.length > 0 && (
          <section aria-labelledby="bureau-title">
            <h2 id="bureau-title" className="text-center text-2xl font-extrabold text-blue sm:text-3xl">
              {t("bureau")}
            </h2>
            <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2 sm:gap-6">
              {bureau.map((member, i) => (
                <Reveal key={member.id} delay={i * 80} className="h-full">
                  <BureauCard member={member} locale={locale} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="departments-title">
          <h2 id="departments-title" className="text-center text-2xl font-extrabold text-blue sm:text-3xl">
            {t("departments")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">{t("departmentsText")}</p>
          {departments.length > 0 ? (
            <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {departments.map((department, i) => (
                <li key={department.id}>
                  <Reveal delay={(i % 4) * 80} className="h-full">
                    <DepartmentCard department={department} locale={locale} cta={t("discover")} />
                  </Reveal>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 text-center text-sm text-muted-foreground">{t("note")}</p>
          )}
        </section>
      </div>
    </>
  );
}
