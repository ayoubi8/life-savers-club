/**
 * iCalendar (RFC 5545) export for one event, and the matching Google Calendar link.
 * Times are written in UTC, so calendar apps convert them to the reader's timezone.
 */

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  url: string;
};

/** Events without an end time are given a default duration of 2 hours. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export function eventEnd(startsAt: string, endsAt: string | null) {
  const start = Date.parse(startsAt);
  const end = endsAt ? Date.parse(endsAt) : NaN;
  return new Date(Number.isFinite(end) && end > start ? end : start + DEFAULT_DURATION_MS);
}

/** 2026-04-18T09:00:00Z → 20260418T090000Z */
export function icsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapes TEXT values: backslash, semicolon, comma and newlines. */
export function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets (continuation lines start with a space), without splitting a UTF-8 character. */
export function icsFold(line: string) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines lose one octet to the leading space
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(event: CalendarEvent, now = new Date()) {
  const description = [event.description, event.url].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Life Savers Club//Events//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@lifesaversclub`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(new Date(event.startsAt))}`,
    `DTEND:${icsDate(eventEnd(event.startsAt, event.endsAt))}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    ...(event.location ? [`LOCATION:${icsEscape(event.location)}`] : []),
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${icsDate(new Date(event.startsAt))}/${icsDate(eventEnd(event.startsAt, event.endsAt))}`,
    details: [event.description, event.url].filter(Boolean).join("\n\n"),
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
