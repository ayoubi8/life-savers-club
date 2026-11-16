import Image from "next/image";
import { ArrowRight, Quote } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Ecg } from "@/components/site/ecg";
import { Reveal } from "@/components/site/reveal";
import { EventCoverCard } from "@/components/events/event-cover-card";
import { JourneyTimeline } from "@/components/site/journey-timeline";
import { getUpcomingAndFeatured } from "@/lib/events/queries";
import type { L10n } from "@/lib/site";
import { SITE_ICONS } from "@/lib/site-content/icons";
import { getHomePage, getSiteGeneral } from "@/lib/site-content/queries";
import { tx } from "@/lib/site-content/schema";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [tEvents, { upcoming, featured }, home, general] = await Promise.all([
    getTranslations({ locale, namespace: "events" }),
    getUpcomingAndFeatured(3),
    getHomePage(),
    getSiteGeneral(),
  ]);
  const t = (value: L10n) => tx(value, locale);
  const { hero, about, journey, contact, testimonials } = home;
  const badge1 = t(hero.badge1);
  const badge2 = t(hero.badge2);
  // Upcoming events first; featured past events fill the section up to 3 cards.
  const homeEvents = [
    ...upcoming.map((event) => ({ event, upcoming: true })),
    ...featured.map((event) => ({ event, upcoming: false })),
  ].slice(0, 3);

  return (
    <>
      {/* HERO */}
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="dots absolute inset-0" />
        <div className="animate-drift absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue/40 blur-3xl" />
        <div className="animate-drift absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-pink/40 blur-3xl [animation-delay:-4s]" />
        <div className="animate-drift absolute bottom-0 left-1/3 h-60 w-60 rounded-full bg-green/30 blur-3xl [animation-delay:-8s]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:py-32">
          <div className="text-center lg:text-left">
            {t(hero.eyebrow) && (
              <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest">
                <span className="pulse-dot h-2 w-2 rounded-full bg-pink" /> {t(hero.eyebrow)}
              </span>
            )}
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl">
              {t(hero.title1)} <span className="text-gradient">{t(hero.title2)}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-white/80 sm:text-lg lg:mx-0">{t(hero.subtitle)}</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/join-us" className="btn btn-pink">{t(hero.ctaJoin)} <ArrowRight size={18} /></Link>
              <Link href="/events" className="btn btn-ghost">{t(hero.ctaEvents)}</Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="animate-float relative grid aspect-square place-items-center overflow-hidden rounded-full bg-white shadow-[0_30px_80px_-20px_rgba(239,74,108,.6)]">
              <Image
                src={hero.image.url}
                alt={t(hero.image.alt)}
                width={520}
                height={430}
                priority
                sizes="(min-width: 640px) 384px, 92vw"
                className="h-auto max-h-[92%] w-[92%] object-contain"
              />
            </div>
            {badge1 && (
              <div className="absolute -bottom-4 -left-2 rounded-2xl border border-white/20 bg-deep/90 px-4 py-3 text-sm font-extrabold shadow-lg sm:-left-8">{badge1}</div>
            )}
            {badge2 && (
              <div className="absolute -right-2 top-4 rounded-2xl border border-white/20 bg-deep/90 px-4 py-3 text-sm font-extrabold shadow-lg sm:-right-6">{badge2}</div>
            )}
          </div>
        </div>
        <Ecg className="relative h-14 w-full opacity-80" />
      </section>

      {/* STATS */}
      {home.stats.length > 0 && (
        <section className="relative z-10 mx-auto -mt-1 max-w-7xl px-4 sm:px-6">
          <div
            className={`grid grid-cols-2 gap-px overflow-hidden rounded-b-card bg-border shadow-[var(--shadow-soft)] ${
              home.stats.length % 3 === 0 ? "md:grid-cols-3" : "md:grid-cols-4"
            }`}
          >
            {home.stats.map((s) => (
              <div key={s.id} className="bg-white px-4 py-6 text-center">
                <div className="text-gradient text-3xl font-extrabold sm:text-4xl">{s.value}</div>
                <div className="mt-1 text-xs font-bold text-muted-foreground sm:text-sm">{t(s.label)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT + VALUES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-extrabold text-ink sm:text-4xl">
              <span className="text-blue">{t(about.title)}</span>
            </h2>
            <div className="mt-2 h-1.5 w-20 rounded-full bg-pink" />
            <p className="mt-6 leading-relaxed text-muted-foreground">{t(about.p1)}</p>
            {t(about.p2) && <p className="mt-4 leading-relaxed text-muted-foreground">{t(about.p2)}</p>}
            <Link href="/team" className="btn btn-outline mt-8">{t(about.cta)} <ArrowRight size={18} /></Link>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {home.values.map(({ id, icon, color, title, text }, i) => {
              const Icon = SITE_ICONS[icon];
              return (
                <Reveal key={id} delay={i * 100}>
                  <div className="card-lift flex h-full items-center gap-4 rounded-card border border-border bg-white p-5">
                    <span
                      className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white ${
                        color === "blue" ? "bg-blue" : color === "pink" ? "bg-pink" : "bg-green"
                      }`}
                    >
                      <Icon size={26} />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-ink">{t(title)}</h3>
                      <p className="text-sm text-muted-foreground">{t(text)}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      {journey.milestones.length > 0 && (
        <JourneyTimeline
          items={journey.milestones}
          locale={locale}
          title={t(journey.title)}
          subtitle={t(journey.subtitle)}
          now={t(journey.now)}
        />
      )}

      {/* EVENTS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-extrabold text-ink sm:text-4xl">
            {upcoming.length > 0 ? t(home.events.nextTitle) : t(home.events.featuredTitle)}
          </h2>
          <Link href="/events" className="font-extrabold text-pink">{t(home.events.allLink)} →</Link>
        </div>
        {homeEvents.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-white px-6 py-10 text-center text-muted-foreground">
            {tEvents("none")}
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {homeEvents.map(({ event, upcoming: isUpcoming }, i) => (
              <Reveal key={event.id} delay={i * 100}>
                <EventCoverCard event={event} locale={locale} badge={isUpcoming ? tEvents("upcoming") : undefined} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* TESTIMONIALS */}
      {testimonials.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold text-ink sm:text-4xl">{t(testimonials.title)}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.items.map((m, i) => (
              <Reveal key={m.id} delay={i * 100}>
                <figure className="card-lift h-full rounded-card border border-border bg-white p-6">
                  <Quote className="text-pink" />
                  <blockquote className="mt-3 text-grey">{t(m.quote)}</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    {m.photo ? (
                      <Image src={m.photo.url} alt={t(m.photo.alt)} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient font-extrabold text-white">
                        {m.name.charAt(0) || "★"}
                      </span>
                    )}
                    <span className="text-sm">
                      <b className="block text-ink">{m.name}</b>
                      <span className="text-muted-foreground">{t(m.role)}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="bg-hero relative overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white sm:py-20">
          <div className="dots absolute inset-0" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold sm:text-4xl">{t(contact.title)}</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">{t(contact.text)}</p>
            <a href={`mailto:${general.email}`} className="btn btn-pink mt-8">{t(contact.cta)}</a>
          </div>
        </div>
      </section>
    </>
  );
}
