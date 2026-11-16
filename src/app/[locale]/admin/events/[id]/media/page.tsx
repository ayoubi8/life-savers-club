import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getEventForAdmin } from "@/lib/events/queries";
import { MediaPanel } from "./media-panel";

export default async function EventMediaPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const event = await getEventForAdmin(id);
  if (!event) notFound();

  return (
    <MediaPanel
      eventId={event.id}
      coverUrl={event.cover_url}
      media={event.media.map((media) => ({
        id: media.id,
        url: media.url,
        kind: media.kind,
        alt: media.alt ?? "",
        size: media.size_bytes,
        width: media.width,
        height: media.height,
      }))}
    />
  );
}
