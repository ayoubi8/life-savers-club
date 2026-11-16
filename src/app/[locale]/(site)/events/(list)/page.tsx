import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventCoverCard } from "@/components/events/event-cover-card";
import { YearDivider } from "@/components/events/year-divider";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { getEventsPageSettings, getPastEvents } from "@/lib/events/queries";
import { groupByYear, localized } from "@/lib/events/utils";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: "events" }), getEventsPageSettings()]);
  return {
    title: localized(settings.title_fr, settings.title_en, locale) || t("title"),
    description: localized(settings.subtitle_fr, settings.subtitle_en, locale) || t("subtitle"),
  };
}

const GRID = {
  grid2: "grid gap-6 md:grid-cols-2",
  grid3: "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
  list: "grid gap-6",
} as const;

/** Past events only, newest first, grouped by year with a divider between years. */
export default async function EventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings, events] = await Promise.all([
    getTranslations({ locale, namespace: "events" }),
    getEventsPageSettings(),
    getPastEvents(),
  ]);

  const title = localized(settings.title_fr, settings.title_en, locale) || t("title");
  const subtitle = localized(settings.subtitle_fr, settings.subtitle_en, locale) || t("subtitle");
  const featured = events.filter((event) => event.featured).sort((a, b) => a.featured_order - b.featured_order).slice(0, 3);
  const years = groupByYear(events);
  const variant = settings.layout === "list" ? "row" : "grid";

  return (
    <>
      <PageHero title={title} subtitle={subtitle} />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        {events.length === 0 ? (
          <div className="mx-auto max-w-md rounded-card border border-dashed border-border bg-white px-6 py-14 text-center">
            <CalendarX2 className="mx-auto h-10 w-10 text-pink" aria-hidden />
            <p className="mt-4 text-lg font-extrabold text-ink">{t("none")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noneHint")}</p>
          </div>
        ) : (
          <>
            {years.length > 1 && (
              <nav aria-label={t("years")} className="mb-10 flex flex-wrap items-center justify-center gap-2">
                <span className="mr-1 text-sm font-bold text-grey">{t("years")}</span>
                {years.map(({ year }) => (
                  <a
                    key={year}
                    href={`#y${year}`}
                    className="rounded-full border border-border bg-white px-4 py-1.5 text-sm font-extrabold text-grey transition hover:border-pink hover:text-pink"
                  >
                    {year}
                  </a>
                ))}
              </nav>
            )}

            {featured.length > 0 && (
              <section aria-labelledby="featured-title" className="mb-16">
                <h2 id="featured-title" className="mb-6 flex items-center gap-3 text-2xl font-extrabold text-blue">
                  <span className="h-6 w-1.5 rounded-full bg-pink" aria-hidden /> {t("featured")}
                </h2>
                <div className="grid gap-6">
                  {featured.map((event, index) => (
                    <Reveal key={event.id} delay={index * 80}>
                      <EventCoverCard event={event} locale={locale} variant="wide" priority={index === 0} />
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            <div className="space-y-16">
              {years.map(({ year, events: list }, yearIndex) => (
                <section key={year} id={`y${year}`} className="scroll-mt-24">
                  <YearDivider
                    year={year}
                    style={settings.divider}
                    color={settings.dividerColor}
                    note={localized(settings.yearNotes[year]?.fr, settings.yearNotes[year]?.en, locale)}
                    count={t("count", { count: list.length })}
                  />
                  <div className={cn(GRID[settings.layout])}>
                    {list.map((event, index) => (
                      <Reveal key={event.id} delay={(index % 3) * 80}>
                        <EventCoverCard
                          event={event}
                          locale={locale}
                          variant={variant}
                          priority={featured.length === 0 && yearIndex === 0 && index < 2}
                        />
                      </Reveal>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
