import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isUuid } from "@/lib/forms/schema";
import { getEventForAdmin } from "@/lib/events/queries";
import { EventHeader } from "./event-header";

export default async function EventAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isUuid(id)) notFound();
  const event = await getEventForAdmin(id);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <EventHeader
        locale={locale}
        event={{ id: event.id, slug: event.slug, title: event.title_fr, status: event.status, startsAt: event.starts_at }}
      />
      <div className="py-6">{children}</div>
    </div>
  );
}
