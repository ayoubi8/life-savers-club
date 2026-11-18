import { Settings2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllEventsForAdmin } from "@/lib/events/queries";
import { EventsList } from "./events-list";
import { FeaturedOrder } from "./featured-order";
import { NewEvent } from "./new-event";

export default async function AdminEventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, events] = await Promise.all([getTranslations({ locale, namespace: "adminEvents" }), getAllEventsForAdmin()]);
  const featured = events.filter((event) => event.featured).sort((a, b) => a.featured_order - b.featured_order);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-blue">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            data-tour="events.page-settings"
            href="/admin/events/page-settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-bold text-grey hover:border-blue hover:text-blue"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            {t("pageSettings.open")}
          </Link>
          <NewEvent />
        </div>
      </header>
      <FeaturedOrder
        items={featured.map((event) => ({ id: event.id, title: event.title_fr, cover: event.cover_url, focus: event.cover_focus, status: event.status }))}
      />
      <EventsList
        locale={locale}
        events={events.map((event) => ({
          id: event.id,
          slug: event.slug,
          title: event.title_fr,
          startsAt: event.starts_at,
          location: event.location,
          cover: event.cover_url,
          focus: event.cover_focus,
          status: event.status,
          featured: event.featured,
          upcoming: event.upcoming,
        }))}
      />
    </div>
  );
}
