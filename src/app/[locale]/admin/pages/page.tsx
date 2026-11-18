import { Home, LayoutTemplate, Handshake } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

const PAGES = [
  { key: "home", href: "/admin/pages/home", icon: Home },
  { key: "sponsors", href: "/admin/pages/sponsors", icon: Handshake },
  { key: "general", href: "/admin/pages/general", icon: LayoutTemplate },
] as const;

export default async function SitePagesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { profile }] = await Promise.all([getTranslations({ locale, namespace: "adminPages" }), getSessionProfile()]);
  if (!isAdmin(profile)) return redirect({ href: "/admin", locale });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-extrabold text-blue">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      <div data-tour="site.pages" className="mt-6 grid gap-4 sm:grid-cols-3">
        {PAGES.map(({ key, href, icon: Icon }) => (
          <Link key={key} href={href} className="rounded-card border border-border bg-white p-5 transition hover:border-blue">
            <Icon className="h-6 w-6 text-pink" aria-hidden />
            <h2 className="mt-3 font-bold text-grey">{t(`${key}.title`)}</h2>
            <p className="text-sm text-muted-foreground">{t(`${key}.subtitle`)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
