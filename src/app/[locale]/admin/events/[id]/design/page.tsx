import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getEventForAdmin } from "@/lib/events/queries";
import { DesignPanel } from "./design-panel";

export default async function EventDesignPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const event = await getEventForAdmin(id);
  if (!event) notFound();
  return <DesignPanel key={event.updated_at} event={event} locale={locale} />;
}
