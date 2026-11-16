import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getSponsorsPage } from "@/lib/site-content/queries";
import { SponsorsForm } from "./sponsors-form";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { profile }, initial] = await Promise.all([
    getTranslations({ locale, namespace: "adminPages" }),
    getSessionProfile(),
    getSponsorsPage(),
  ]);
  if (!isAdmin(profile)) return redirect({ href: "/admin", locale });

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/pages" className="text-xs font-bold text-blue hover:underline">
        ← {t("back")}
      </Link>
      <header className="mb-6 mt-1">
        <h1 className="text-2xl font-extrabold text-blue">{t("sponsors.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("sponsors.subtitle")}</p>
      </header>
      <SponsorsForm initial={initial} locale={locale} />
    </div>
  );
}
