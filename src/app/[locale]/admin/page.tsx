import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permissions";

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { profile }] = await Promise.all([getTranslations({ locale, namespace: "admin" }), getSessionProfile()]);

  // Only the sections this account may open (the admin layout already guarantees an active profile).
  const cards = [
    { key: "events", href: "/admin/events", text: t("manageEvents"), show: can(profile, "events") },
    { key: "forms", href: "/admin/forms", text: t("manageForms"), show: can(profile, "forms") },
    { key: "media", href: "/admin/media", text: t("manageMedia"), show: can(profile, "media") },
    { key: "finance", href: "/admin/finance", text: t("manageFinance"), show: can(profile, "finance") },
    { key: "team", href: "/admin/team", text: t("manageTeam"), show: isAdmin(profile) },
    { key: "pages", href: "/admin/pages", text: t("managePages"), show: isAdmin(profile) },
  ] as const;
  const visible = cards.filter((c) => c.show);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-blue">{t("dashboard")}</h1>
      <p className="mt-2 text-muted-foreground">{t("welcome")} 👋</p>

      {visible.length === 0 ? (
        <div className="mt-6 max-w-lg rounded-card border border-dashed border-border bg-white p-6">
          <h2 className="font-extrabold text-grey">{t("noAccessTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("noAccessText")}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {visible.map((c) => (
            <Link key={c.key} href={c.href} className="rounded-card border border-border bg-white p-5 transition hover:border-blue">
              <h2 className="font-bold text-grey">{t(c.key)}</h2>
              <p className="text-sm text-muted-foreground">{c.text}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
