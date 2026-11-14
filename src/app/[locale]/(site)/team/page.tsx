import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { team } from "@/lib/sample-data";
import { pick } from "@/lib/site";

const ring = { pink: "from-pink to-[#ff9db1]", blue: "from-blue to-[#7db4e6]", green: "from-green to-[#b2e394]" };

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "team" });

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {team.map((m, i) => (
            <Reveal key={i} delay={(i % 4) * 80}>
              <div className="card-lift rounded-card border border-border bg-white p-5 text-center">
                <div className={`mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br p-1 sm:h-28 sm:w-28 ${ring[m.color]}`}>
                  <span className="grid h-full w-full place-items-center rounded-full bg-white text-3xl font-extrabold text-grey">
                    {m.name[0]}
                  </span>
                </div>
                <h3 className="mt-4 font-extrabold text-ink">{m.name}</h3>
                <p className="text-sm font-bold text-pink">{pick(m.role, locale)}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">{t("note")}</p>
      </div>
    </>
  );
}
