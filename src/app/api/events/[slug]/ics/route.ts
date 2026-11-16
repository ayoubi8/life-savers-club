import { getOrigin } from "@/lib/forms/queries";
import { buildIcs } from "@/lib/events/ics";
import { getEventBySlug } from "@/lib/events/queries";
import { localized } from "@/lib/events/utils";

export const runtime = "nodejs";

/** "Add to calendar" file for one event. ?lang=en for English texts (French by default). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getEventBySlug(slug);
  if (!result) return new Response("Not found", { status: 404 });
  const { event, preview } = result;

  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "fr";
  const ics = buildIcs({
    id: event.id,
    title: localized(event.title_fr, event.title_en, locale),
    description: localized(event.description_fr, event.description_en, locale),
    location: event.location,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    url: `${await getOrigin()}/${locale}/events/${event.slug}`,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      // Drafts are only served to leaders: never cache them in shared caches.
      "Cache-Control": preview ? "private, no-store" : "public, max-age=300",
    },
  });
}
