import Image from "next/image";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { EventCard } from "@/lib/events/types";
import { localized } from "@/lib/events/utils";
import { cn } from "@/lib/utils";

const TZ = "Africa/Algiers";

export type CardVariant = "grid" | "row" | "wide";

/** Cover image, or a branded gradient from the event's own theme when there is no photo yet. */
function Cover({ event, title, sizes, priority }: { event: EventCard; title: string; sizes: string; priority?: boolean }) {
  if (event.cover_url) {
    return (
      <Image
        src={event.cover_url}
        alt={event.cover_alt || title}
        fill
        sizes={sizes}
        priority={priority}
        quality={75}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        style={{ objectPosition: `${event.cover_focus.x}% ${event.cover_focus.y}%` }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className="absolute inset-0 grid place-items-center"
      style={{ background: `linear-gradient(135deg, ${event.theme.primary}, ${event.theme.accent})` }}
    >
      <Image src="/brand/logo.png" alt="" width={96} height={80} className="h-20 w-auto rounded-full bg-white/90 p-2 opacity-90" />
    </div>
  );
}

/** Day / month / year badge over the photo. */
function DateBadge({ startsAt, locale }: { startsAt: string; locale: string }) {
  const date = new Date(startsAt);
  const part = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: TZ }).format(date);
  return (
    <span className="absolute left-3 top-3 flex min-w-14 flex-col items-center rounded-xl bg-white/95 px-2.5 py-1.5 text-center leading-none text-ink shadow-md">
      <span className="text-xl font-extrabold">{part({ day: "numeric" })}</span>
      <span className="mt-0.5 text-[11px] font-extrabold uppercase text-pink">{part({ month: "short" })}</span>
      <span className="mt-0.5 text-[10px] font-bold text-grey">{part({ year: "numeric" })}</span>
    </span>
  );
}

/**
 * A large photo card for an event. The whole card links to the event page.
 * `grid` = photo on top, `row` = photo on the left (list layout), `wide` = featured.
 */
export function EventCoverCard({
  event,
  locale,
  variant = "grid",
  priority = false,
  badge,
}: {
  event: EventCard;
  locale: string;
  variant?: CardVariant;
  priority?: boolean;
  badge?: string; // e.g. "À venir" on the home page
}) {
  const title = localized(event.title_fr, event.title_en, locale);
  const description = localized(event.description_fr, event.description_en, locale);
  const stats = event.stats.slice(0, 2);
  const horizontal = variant !== "grid";
  const sizes =
    variant === "wide"
      ? "(min-width: 1024px) 720px, 100vw"
      : variant === "row"
        ? "(min-width: 768px) 420px, 100vw"
        : "(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw";

  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        "group card-lift flex h-full overflow-hidden rounded-card border border-border bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue",
        horizontal ? "flex-col md:flex-row" : "flex-col",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          variant === "grid" && "aspect-[16/10]",
          variant === "row" && "aspect-[16/10] md:aspect-auto md:min-h-60 md:w-[42%]",
          variant === "wide" && "aspect-[16/10] md:aspect-auto md:min-h-80 md:w-[58%]",
        )}
      >
        <Cover event={event} title={title} sizes={sizes} priority={priority} />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
        <DateBadge startsAt={event.starts_at} locale={locale} />
        {badge && (
          <span className="absolute right-3 top-3 rounded-full bg-pink px-3 py-1 text-xs font-extrabold text-white shadow">
            {badge}
          </span>
        )}
        {event.tags.length > 0 && (
          <span className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {event.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-extrabold text-ink">
                {tag}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col p-5", variant === "wide" && "md:p-8")}>
        <h3
          className={cn(
            "font-extrabold leading-snug text-ink transition-colors group-hover:text-blue",
            variant === "wide" ? "text-2xl md:text-3xl" : "line-clamp-2 text-lg",
          )}
        >
          {title}
        </h3>
        {description && (
          <p className={cn("mt-2 text-sm text-muted-foreground", variant === "wide" ? "line-clamp-4 md:text-base" : "line-clamp-2")}>
            {description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs font-semibold text-grey">
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} className="text-blue" aria-hidden />
              {event.location}
            </span>
          )}
          {stats.map((stat) => (
            <span key={stat.label_fr} className="rounded-full bg-muted px-2.5 py-1">
              <strong className="text-pink">{stat.value}</strong> {localized(stat.label_fr, stat.label_en, locale)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
