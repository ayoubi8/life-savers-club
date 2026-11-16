import { Activity, Award, CalendarDays, Droplet, Heart, MapPin, Stethoscope, Users, type LucideIcon } from "lucide-react";
import type { EventStat, StatIcon } from "@/lib/events/types";
import { localized } from "@/lib/events/utils";

const ICONS: Record<StatIcon, LucideIcon> = {
  users: Users,
  heart: Heart,
  droplet: Droplet,
  stethoscope: Stethoscope,
  calendar: CalendarDays,
  award: Award,
  activity: Activity,
  "map-pin": MapPin,
};

/** The event's key numbers as a row of cards. */
export function EventStats({ stats, locale, label }: { stats: EventStat[]; locale: string; label: string }) {
  if (!stats.length) return null;
  return (
    <section aria-label={label} className="mx-auto max-w-5xl px-4 sm:px-6">
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = ICONS[stat.icon];
          return (
            <li
              key={index}
              className="rounded-[var(--form-card-radius,1.25rem)] border border-black/5 bg-white p-4 text-center text-ink shadow-sm sm:p-5"
            >
              <Icon className="mx-auto h-6 w-6 text-[var(--event-accent)]" aria-hidden />
              <p className="mt-2 text-3xl font-extrabold text-[var(--event-primary)] sm:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm font-semibold text-grey">{localized(stat.label_fr, stat.label_en, locale)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
