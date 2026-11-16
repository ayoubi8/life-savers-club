import Image from "next/image";
import { CalendarDays, MapPin, Users } from "lucide-react";
import type { EventFull } from "@/lib/events/types";
import { cn } from "@/lib/utils";

const TZ = "Africa/Algiers";

/** "samedi 18 avril 2026" or "18 – 20 avril 2026" (same formatter handles the range). */
export function formatEventDate(startsAt: string, endsAt: string | null, locale: string) {
  const options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ };
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const day = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);
  if (end && day(end) !== day(start)) {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).formatRange(start, end);
  }
  return new Intl.DateTimeFormat(locale, options).format(start);
}

type MetaProps = {
  event: EventFull;
  locale: string;
  attendeesLabel: string | null;
  mapLabel: string;
  tone: "light" | "dark";
};

function Meta({ event, locale, attendeesLabel, mapLabel, tone }: MetaProps) {
  const pill = tone === "light" ? "bg-white/15 text-white backdrop-blur" : "bg-black/5";
  return (
    <ul className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
      <li className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5", pill)}>
        <CalendarDays className="h-4 w-4" aria-hidden />
        {/* Only the first letter: "Mardi 10 juin 2025", not "Mardi 10 Juin 2025". */}
        <time dateTime={event.starts_at} className="inline-block first-letter:uppercase">
          {formatEventDate(event.starts_at, event.ends_at, locale)}
        </time>
      </li>
      {event.location && (
        <li>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            title={mapLabel}
            className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 hover:underline", pill)}
          >
            <MapPin className="h-4 w-4" aria-hidden />
            {event.location}
          </a>
        </li>
      )}
      {attendeesLabel && (
        <li className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5", pill)}>
          <Users className="h-4 w-4" aria-hidden />
          {attendeesLabel}
        </li>
      )}
    </ul>
  );
}

function Tags({ tags, tone }: { tags: string[]; tone: "light" | "dark" }) {
  if (!tags.length) return null;
  return (
    <p className="mb-3 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide",
            tone === "light" ? "bg-white text-ink" : "bg-[var(--event-accent)] text-white",
          )}
        >
          {tag}
        </span>
      ))}
    </p>
  );
}

/**
 * Event page header in one of three layouts chosen in the event's Design settings:
 * full-bleed photo with overlay, split (photo beside the title), or minimal colour band.
 * Without a cover photo the minimal band is used.
 */
export function EventHero({
  event,
  title,
  summary,
  locale,
  attendeesLabel,
  mapLabel,
}: {
  event: EventFull;
  title: string;
  summary: string;
  locale: string;
  attendeesLabel: string | null;
  mapLabel: string;
}) {
  const layout = event.cover_url ? event.theme.headerLayout : "minimal";
  const position = `${event.cover_focus.x}% ${event.cover_focus.y}%`;
  const cover = event.cover_url ? (
    <Image
      src={event.cover_url}
      alt={event.cover_alt || title}
      fill
      priority
      sizes={layout === "split" ? "(min-width: 768px) 50vw, 100vw" : "100vw"}
      quality={85}
      className="object-cover"
      style={{ objectPosition: position }}
    />
  ) : null;

  if (layout === "fullBleed") {
    return (
      <header className="relative isolate flex min-h-[26rem] items-end overflow-hidden text-white sm:min-h-[32rem] lg:min-h-[38rem]">
        {cover}
        <div aria-hidden className="absolute inset-0 -z-0 bg-black" style={{ opacity: "var(--event-overlay)" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-24 sm:px-6 sm:pb-14">
          <Tags tags={event.tags} tone="light" />
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight drop-shadow sm:text-5xl lg:text-6xl">{title}</h1>
          {summary && <p className="mt-4 max-w-2xl text-lg text-white/90">{summary}</p>}
          <Meta event={event} locale={locale} attendeesLabel={attendeesLabel} mapLabel={mapLabel} tone="light" />
        </div>
      </header>
    );
  }

  if (layout === "split") {
    return (
      <header className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-10 sm:px-6 md:grid-cols-2 md:pt-16">
        <div>
          <Tags tags={event.tags} tone="dark" />
          <h1 className="text-4xl font-extrabold leading-tight text-[var(--event-heading)] sm:text-5xl">{title}</h1>
          {summary && <p className="mt-4 text-lg opacity-85">{summary}</p>}
          <Meta event={event} locale={locale} attendeesLabel={attendeesLabel} mapLabel={mapLabel} tone="dark" />
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--form-card-radius,1.25rem)] shadow-xl">{cover}</div>
      </header>
    );
  }

  // Minimal: colour band, then the cover (if any) as a wide image below.
  return (
    <>
      <header className="event-band text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <Tags tags={event.tags} tone="light" />
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
          {summary && <p className="mt-4 max-w-2xl text-lg text-white/90">{summary}</p>}
          <Meta event={event} locale={locale} attendeesLabel={attendeesLabel} mapLabel={mapLabel} tone="light" />
        </div>
      </header>
      {cover && (
        <div className="mx-auto -mt-8 max-w-5xl px-4 sm:px-6">
          <div className="relative aspect-[21/9] overflow-hidden rounded-[var(--form-card-radius,1.25rem)] shadow-xl">{cover}</div>
        </div>
      )}
    </>
  );
}
