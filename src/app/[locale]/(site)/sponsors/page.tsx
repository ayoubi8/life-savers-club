import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { sponsors } from "@/lib/sample-data";
import { site } from "@/lib/site";

export default async function SponsorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "sponsors" });

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-6">
          {sponsors.map((s, i) => (
            <Reveal key={s} delay={(i % 6) * 60}>
              <div className="card-lift grid h-28 place-items-center rounded-card border border-border bg-white font-extrabold text-grey/60">{s}</div>
            </Reveal>
          ))}
        </div>
        <div className="mt-16 rounded-[2rem] bg-muted px-6 py-12 text-center">
          <h2 className="text-2xl font-extrabold text-blue sm:text-3xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">{t("ctaText")}</p>
          <a href={`mailto:${site.email}`} className="btn btn-pink mt-6">{t("cta")}</a>
        </div>
      </div>
    </>
  );
}
