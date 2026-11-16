import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DepartmentBody } from "@/components/team/department-body";
import { DepartmentCard } from "@/components/team/department-card";
import { DepartmentHero } from "@/components/team/department-hero";
import { Link } from "@/i18n/navigation";
import { localized } from "@/lib/events/utils";
import { getOrigin } from "@/lib/forms/queries";
import { getDepartmentBySlug, getPublishedDepartments } from "@/lib/team/queries";
import { departmentThemeStyle } from "@/lib/team/theme";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = await getDepartmentBySlug(slug);
  if (!result) return {};
  const { department, preview } = result;
  const title = localized(department.name_fr, department.name_en, locale);
  const description = localized(department.tagline_fr, department.tagline_en, locale) || undefined;
  const origin = await getOrigin();
  const url = `${origin}/${locale}/team/${department.slug}`;
  const image = department.cover_url ?? department.leader_photo_url;
  return {
    title,
    description,
    robots: preview ? { index: false, follow: false } : undefined,
    alternates: {
      canonical: url,
      languages: { fr: `${origin}/fr/team/${department.slug}`, en: `${origin}/en/team/${department.slug}` },
    },
    openGraph: {
      type: "website",
      url,
      siteName: "Life Savers Club",
      locale: locale === "en" ? "en_US" : "fr_FR",
      title,
      description,
      images: image ? [{ url: image, alt: department.cover_alt || title }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function DepartmentPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const result = await getDepartmentBySlug(slug);
  if (!result) notFound();
  const { department, preview } = result;

  const [t, tTeam, all] = await Promise.all([
    getTranslations({ locale, namespace: "departmentPage" }),
    getTranslations({ locale, namespace: "team" }),
    getPublishedDepartments(),
  ]);
  const name = localized(department.name_fr, department.name_en, locale);
  const tagline = localized(department.tagline_fr, department.tagline_en, locale);
  const others = all.filter((other) => other.id !== department.id);

  return (
    <div className="event-theme pb-20" style={departmentThemeStyle(department.theme)}>
      {preview && (
        <p role="status" className="flex items-center justify-center gap-2 bg-[#fff4d6] px-4 py-2.5 text-center text-sm font-bold text-[#7a5200]">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          {t("previewBanner")}
        </p>
      )}

      <DepartmentHero department={department} name={name} tagline={tagline} eyebrow={t("eyebrow")} />

      <div className="mt-10 sm:mt-14">
        <DepartmentBody
          department={department}
          locale={locale}
          labels={{ leader: t("leader"), mission: t("mission"), team: t("team"), members: t("members") }}
        />
      </div>

      <nav aria-label={t("back")} className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        {others.length > 0 && (
          <div className="border-t border-current/10 pt-10">
            <h2 className="mb-6 text-xl font-extrabold">{t("others")}</h2>
            {/* Other departments keep their own colours: a white strip so their cards read as on /team. */}
            <ul className="grid grid-cols-2 gap-4 rounded-[var(--form-card-radius,1.25rem)] bg-muted p-4 text-ink sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {others.map((other) => (
                <li key={other.id}>
                  <DepartmentCard department={other} locale={locale} cta={tTeam("discover")} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-10 text-center">
          <Link
            href="/team"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-extrabold text-white shadow-lg transition hover:opacity-90"
            style={{ background: "var(--event-primary)" }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("back")}
          </Link>
        </p>
      </nav>
    </div>
  );
}
