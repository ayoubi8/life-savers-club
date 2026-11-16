import { describe, expect, it } from "vitest";
import { buildIcs, eventEnd, googleCalendarUrl, icsEscape, icsFold } from "./ics";
import { eventJsonLd, serializeJsonLd } from "./seo";
import type { EventFull } from "./types";

const event = {
  id: "8f1c2d3e-0000-4000-8000-000000000001",
  title: "Journée don de sang; édition 2026, Alger",
  description: "Venez nombreux.\nApportez une pièce d'identité.",
  location: "Faculté de médecine, Alger",
  startsAt: "2026-12-05T08:00:00Z",
  endsAt: null,
  url: "https://example.org/fr/events/blood-drive",
};

describe("ics", () => {
  it("escapes text values", () => {
    expect(icsEscape("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });

  it("defaults to 2 hours when the end is missing or before the start", () => {
    expect(eventEnd("2026-12-05T08:00:00Z", null).toISOString()).toBe("2026-12-05T10:00:00.000Z");
    expect(eventEnd("2026-12-05T08:00:00Z", "2026-12-05T07:00:00Z").toISOString()).toBe("2026-12-05T10:00:00.000Z");
    expect(eventEnd("2026-12-05T08:00:00Z", "2026-12-06T17:00:00Z").toISOString()).toBe("2026-12-06T17:00:00.000Z");
  });

  it("folds long lines at 75 octets without breaking accented characters", () => {
    const folded = icsFold(`SUMMARY:${"é".repeat(60)}`);
    const encoder = new TextEncoder();
    for (const line of folded.split("\r\n")) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(`SUMMARY:${"é".repeat(60)}`);
  });

  it("builds a valid VEVENT in UTC with CRLF line endings", () => {
    const ics = buildIcs(event, new Date("2026-11-15T12:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261205T080000Z");
    expect(ics).toContain("DTEND:20261205T100000Z");
    expect(ics).toContain("DTSTAMP:20261115T120000Z");
    expect(ics).toContain("SUMMARY:Journée don de sang\\; édition 2026\\, Alger");
    expect(ics).toContain("LOCATION:Faculté de médecine\\, Alger");
    expect(ics.split("\r\n").every((line) => !line.includes("\n"))).toBe(true);
  });

  it("builds a Google Calendar link", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20261205T080000Z/20261205T100000Z");
    expect(url.searchParams.get("location")).toBe(event.location);
  });
});

describe("event JSON-LD", () => {
  const full = {
    id: "1", slug: "blood-drive", starts_at: "2026-12-05T08:00:00Z", ends_at: null,
    cover_url: "https://x.supabase.co/storage/v1/object/public/event-media/a.webp", location: "Alger",
  } as unknown as EventFull;

  it("describes the event for search engines", () => {
    const data = eventJsonLd(full, "Don de sang", "", "https://example.org/fr/events/blood-drive", "https://example.org");
    expect(data).toMatchObject({ "@type": "Event", name: "Don de sang", endDate: "2026-12-05T10:00:00.000Z", location: { name: "Alger" } });
    expect(data.description).toBeUndefined();
  });

  it("cannot close the script tag", () => {
    const json = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(json).not.toContain("<");
    expect(JSON.parse(json).name).toBe("</script><script>alert(1)</script>");
  });
});
