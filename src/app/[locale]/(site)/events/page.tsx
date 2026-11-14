import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventCard } from "@/components/site/cards";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { events } from "@/lib/sample-data";

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "events" });
  const groups = [
    { label: t("upcoming"), list: events.filter((e) => !e.past) },
    { label: t("past"), list: events.filter((e) => e.past) },
  ];

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-16 sm:px-6">
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="mb-6 flex items-center gap-3 text-2xl font-extrabold text-blue">
              <span className="h-6 w-1.5 rounded-full bg-pink" /> {g.label}
            </h2>
            {g.list.length === 0 ? (
              <p className="text-muted-foreground">{t("none")}</p>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {g.list.map((e, i) => (
                  <Reveal key={e.slug} delay={i * 80}><EventCard e={e} locale={locale} i={i} /></Reveal>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
