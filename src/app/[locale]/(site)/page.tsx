import Image from "next/image";
import { ArrowRight, BookOpen, HeartHandshake, Network, Quote } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Ecg } from "@/components/site/ecg";
import { Reveal } from "@/components/site/reveal";
import { EventCard } from "@/components/site/cards";
import { events, stats, testimonials, timeline } from "@/lib/sample-data";
import { pick, site } from "@/lib/site";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const upcoming = events.filter((e) => !e.past).slice(0, 2);

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
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest">
              <span className="pulse-dot h-2 w-2 rounded-full bg-pink" /> {t("eyebrow")}
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl">
              {t("title1")} <span className="text-gradient">{t("title2")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-white/80 sm:text-lg lg:mx-0">{t("subtitle")}</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/join-us" className="btn btn-pink">{t("ctaJoin")} <ArrowRight size={18} /></Link>
              <Link href="/events" className="btn btn-ghost">{t("ctaEvents")}</Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="animate-float relative grid aspect-square place-items-center rounded-full bg-white shadow-[0_30px_80px_-20px_rgba(239,74,108,.6)]">
              <Image src="/brand/logo.png" alt="Life Savers" width={520} height={430} priority className="h-auto w-[92%] object-contain" />
            </div>
            <div className="absolute -bottom-4 -left-2 rounded-2xl border border-white/20 bg-deep/90 px-4 py-3 text-sm font-extrabold shadow-lg sm:-left-8">❤️ {stats[0].value} {pick(stats[0].label, locale)}</div>
            <div className="absolute -right-2 top-4 rounded-2xl border border-white/20 bg-deep/90 px-4 py-3 text-sm font-extrabold shadow-lg sm:-right-6">🩺 {stats[1].value} {pick(stats[1].label, locale)}</div>
          </div>
        </div>
        <Ecg className="relative h-14 w-full opacity-80" />
      </section>

      {/* STATS */}
      <section className="relative z-10 mx-auto -mt-1 max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-card bg-border shadow-[var(--shadow-soft)] md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.value} className="bg-white px-4 py-6 text-center">
              <div className="text-gradient text-3xl font-extrabold sm:text-4xl">{s.value}</div>
              <div className="mt-1 text-xs font-bold text-muted-foreground sm:text-sm">{pick(s.label, locale)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT + VALUES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-extrabold text-ink sm:text-4xl">
              <span className="text-blue">{t("aboutTitle")}</span>
            </h2>
            <div className="mt-2 h-1.5 w-20 rounded-full bg-pink" />
            <p className="mt-6 leading-relaxed text-muted-foreground">{t("aboutP1")}</p>
            <p className="mt-4 leading-relaxed text-muted-foreground">{t("aboutP2")}</p>
            <Link href="/team" className="btn btn-outline mt-8">{t("aboutCta")} <ArrowRight size={18} /></Link>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: BookOpen, c: "blue", k: "v1" },
              { icon: HeartHandshake, c: "pink", k: "v2" },
              { icon: Network, c: "green", k: "v3" },
            ].map(({ icon: Icon, c, k }, i) => (
              <Reveal key={k} delay={i * 100}>
                <div className="card-lift flex h-full items-center gap-4 rounded-card border border-border bg-white p-5">
                  <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white ${c === "blue" ? "bg-blue" : c === "pink" ? "bg-pink" : "bg-green"}`}>
                    <Icon size={26} />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-ink">{t(`${k}t`)}</h3>
                    <p className="text-sm text-muted-foreground">{t(`${k}d`)}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="bg-muted py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold text-blue sm:text-4xl">{t("journey")}</h2>
          <ol className="relative mt-12 border-l-2 border-dashed border-blue/30 pl-8 sm:ml-24 sm:pl-10">
            {timeline.map((m, i) => (
              <Reveal key={m.year} delay={i * 80}>
                <li className="relative pb-10 last:pb-0">
                  <span className="absolute -left-[2.6rem] top-1 grid h-5 w-5 place-items-center rounded-full bg-white ring-4 ring-blue/20 sm:-left-[3.1rem]">
                    <span className="h-2.5 w-2.5 rounded-full bg-pink" />
                  </span>
                  <span className="text-2xl font-extrabold text-pink sm:absolute sm:-left-32 sm:top-0 sm:w-20 sm:text-right">{m.year}</span>
                  <h3 className="font-extrabold text-ink">{pick(m.title, locale)}</h3>
                  <p className="text-sm text-muted-foreground">{pick(m.text, locale)}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* EVENTS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-extrabold text-ink sm:text-4xl">{t("nextEvents")}</h2>
          <Link href="/events" className="font-extrabold text-pink">{t("allEvents")} →</Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {upcoming.map((e, i) => (
            <Reveal key={e.slug} delay={i * 100}><EventCard e={e} locale={locale} i={i} /></Reveal>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold text-ink sm:text-4xl">{t("say")}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((m, i) => (
            <Reveal key={i} delay={i * 100}>
              <figure className="card-lift h-full rounded-card border border-border bg-white p-6">
                <Quote className="text-pink" />
                <blockquote className="mt-3 text-grey">{pick(m.quote, locale)}</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient font-extrabold text-white">{m.name[0]}</span>
                  <span className="text-sm"><b className="block text-ink">{m.name}</b><span className="text-muted-foreground">{pick(m.role, locale)}</span></span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="bg-hero relative overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white sm:py-20">
          <div className="dots absolute inset-0" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold sm:text-4xl">{t("touchTitle")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">{t("touchText")}</p>
            <a href={`mailto:${site.email}`} className="btn btn-pink mt-8">{t("touchCta")}</a>
          </div>
        </div>
      </section>
    </>
  );
}
