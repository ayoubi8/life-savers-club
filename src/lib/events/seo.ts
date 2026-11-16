import { eventEnd } from "./ics";
import type { EventFull } from "./types";

/** schema.org Event, so search engines can show the date and place. */
export function eventJsonLd(event: EventFull, title: string, summary: string, url: string, origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    description: summary || undefined,
    url,
    startDate: event.starts_at,
    endDate: eventEnd(event.starts_at, event.ends_at).toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: event.cover_url ? [event.cover_url] : undefined,
    location: event.location ? { "@type": "Place", name: event.location, address: event.location } : undefined,
    organizer: { "@type": "Organization", name: "Life Savers Club", url: origin },
    isAccessibleForFree: true,
  };
}

/** JSON for a <script type="application/ld+json">: "<" is escaped so the text can never close the tag early. */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
