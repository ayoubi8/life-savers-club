import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAllEventsForAdmin, getEventsPageSettings } from "@/lib/events/queries";
import { eventYear } from "@/lib/events/utils";
import { PageSettingsForm } from "./page-settings-form";

export default async function EventsPageSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings, events, { profile }] = await Promise.all([
    getTranslations({ locale, namespace: "adminEvents" }),
    getEventsPageSettings(),
    getAllEventsForAdmin(),
    getSessionProfile(),
  ]);
  // Years that can appear on the public page (past events), newest first.
  const years = [...new Set(events.filter((event) => !event.upcoming).map((event) => eventYear(event.starts_at)))].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/events" className="text-xs font-bold text-blue hover:underline">
        ← {t("back")}
      </Link>
      <header className="mb-6 mt-1">
        <h1 className="text-2xl font-extrabold text-blue">{t("pageSettings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("pageSettings.subtitle")}</p>
      </header>
      <PageSettingsForm initial={settings} years={years} locale={locale} canEdit={can(profile, "events")} />
    </div>
  );
}
