import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import type { L10n } from "@/lib/site";
import { getSiteGeneral, getSponsorsPage } from "@/lib/site-content/queries";
import { tx, type Sponsor } from "@/lib/site-content/schema";

function SponsorTile({ sponsor, alt }: { sponsor: Sponsor; alt: string }) {
  const body = sponsor.logo ? (
    <Image src={sponsor.logo.url} alt={alt || sponsor.name} width={200} height={96} className="max-h-16 w-auto max-w-[80%] object-contain" />
  ) : (
    <span className="px-3 text-center font-extrabold text-grey/60">{sponsor.name}</span>
  );
  const className = "card-lift grid h-28 place-items-center rounded-card border border-border bg-white";
  return sponsor.url ? (
    <a href={sponsor.url} target="_blank" rel="noreferrer" title={sponsor.name} className={className}>
      {body}
    </a>
  ) : (
    <div title={sponsor.name} className={className}>{body}</div>
  );
}

export default async function SponsorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, general] = await Promise.all([getSponsorsPage(), getSiteGeneral()]);
  const t = (value: L10n) => tx(value, locale);

  return (
    <>
      <PageHero title={t(page.hero.title)} subtitle={t(page.hero.subtitle)} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        {page.sponsors.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-6">
            {page.sponsors.map((s, i) => (
              <Reveal key={s.id} delay={(i % 6) * 60}>
                <SponsorTile sponsor={s} alt={s.logo ? t(s.logo.alt) : ""} />
              </Reveal>
            ))}
          </div>
        )}
        <div className="mt-16 rounded-[2rem] bg-muted px-6 py-12 text-center">
          <h2 className="text-2xl font-extrabold text-blue sm:text-3xl">{t(page.cta.title)}</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">{t(page.cta.text)}</p>
          <a href={`mailto:${general.email}`} className="btn btn-pink mt-6">{t(page.cta.button)}</a>
        </div>
      </div>
    </>
  );
}
