import { GraduationCap, HeartPulse, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { site } from "@/lib/site";

export default async function JoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "join" });
  const benefits = [
    { icon: GraduationCap, k: "b1", c: "bg-blue" },
    { icon: Users, k: "b2", c: "bg-green" },
    { icon: HeartPulse, k: "b3", c: "bg-pink" },
  ];

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map(({ icon: Icon, k, c }, i) => (
            <Reveal key={k} delay={i * 100}>
              <div className="card-lift h-full rounded-card border border-border bg-white p-6 text-center">
                <span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white ${c}`}><Icon size={28} /></span>
                <h3 className="mt-4 text-lg font-extrabold text-ink">{t(`${k}t`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`${k}d`)}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* The real membership form will be rendered here by the form builder (phase 4). */}
        <div className="mt-12 rounded-[2rem] border-2 border-dashed border-blue/30 bg-muted/60 px-6 py-12 text-center">
          <h2 className="text-2xl font-extrabold text-blue">{t("formTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t("formText")}</p>
          <a href={`mailto:${site.email}`} className="btn btn-pink mt-6">{t("contact")}</a>
        </div>
      </div>
    </>
  );
}
