import { CalendarDays, MapPin } from "lucide-react";
import { pick } from "@/lib/site";
import type { events } from "@/lib/sample-data";

const fmt = (d: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

const accents = ["from-pink to-[#ff8fa6]", "from-blue to-[#6aa6dd]", "from-green to-[#a4dc82]"];

export function EventCard({ e, locale, i = 0 }: { e: (typeof events)[number]; locale: string; i?: number }) {
  const d = new Date(e.date);
  return (
    <article className="card-lift flex overflow-hidden rounded-card border border-border bg-white">
      <div className={`flex w-20 shrink-0 flex-col items-center justify-center bg-gradient-to-b ${accents[i % 3]} text-white sm:w-24`}>
        <span className="text-3xl font-extrabold leading-none">{d.getDate()}</span>
        <span className="text-xs font-bold uppercase">
          {new Intl.DateTimeFormat(locale, { month: "short" }).format(d)}
        </span>
        <span className="text-xs opacity-80">{d.getFullYear()}</span>
      </div>
      <div className="min-w-0 flex-1 p-5">
        <span className="rounded-full bg-pink/10 px-3 py-1 text-xs font-extrabold text-pink">{pick(e.tag, locale)}</span>
        <h3 className="mt-2 text-lg font-extrabold text-ink">{pick(e.title, locale)}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{pick(e.text, locale)}</p>
        <p className="mt-3 flex items-center gap-4 text-xs font-semibold text-grey">
          <span className="flex items-center gap-1"><CalendarDays size={14} className="text-blue" />{fmt(e.date, locale)}</span>
          <span className="flex items-center gap-1"><MapPin size={14} className="text-blue" />{e.place}</span>
        </p>
      </div>
    </article>
  );
}

