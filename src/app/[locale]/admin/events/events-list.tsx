"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Copy, ExternalLink, ImageOff, MapPin, Pencil, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/ui/confirm";
import { deleteEvent, duplicateEvent, setFeatured } from "@/lib/events/actions";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  location: string | null;
  cover: string | null;
  focus: { x: number; y: number };
  status: "draft" | "published" | "archived";
  featured: boolean;
  upcoming: boolean;
};

const statusClass = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green/10 text-green",
  archived: "bg-border text-muted-foreground",
} as const;

const select =
  "rounded-full border border-border bg-white px-3 py-2 text-sm font-semibold text-grey outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

function yearOf(iso: string) {
  return new Date(iso).getFullYear();
}

export function EventsList({ events, locale }: { events: Row[]; locale: string }) {
  const t = useTranslations("adminEvents");
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Row["status"]>("all");
  const [when, setWhen] = useState<"all" | "past" | "upcoming">("all");
  const [year, setYear] = useState<"all" | string>("all");
  const [featuredState, setFeaturedState] = useState<Record<string, boolean>>({});

  const years = useMemo(() => [...new Set(events.map((event) => yearOf(event.startsAt)))].sort((a, b) => b - a), [events]);
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Algiers" }),
    [locale],
  );

  const visible = events.filter((event) => {
    const text = `${event.title} ${event.location ?? ""}`.toLocaleLowerCase(locale);
    if (query && !text.includes(query.trim().toLocaleLowerCase(locale))) return false;
    if (status !== "all" && event.status !== status) return false;
    if (when === "past" && event.upcoming) return false;
    if (when === "upcoming" && !event.upcoming) return false;
    if (year !== "all" && String(yearOf(event.startsAt)) !== year) return false;
    return true;
  });

  function toggleFeatured(event: Row) {
    const next = !(featuredState[event.id] ?? event.featured);
    setFeaturedState((state) => ({ ...state, [event.id]: next }));
    startTransition(async () => {
      const result = await setFeatured(event.id, next);
      if (!result.ok) {
        setFeaturedState((state) => ({ ...state, [event.id]: !next }));
        toast.error(t("failed"));
        return;
      }
      router.refresh(); // updates the "À la une" panel
    });
  }

  function duplicate(event: Row) {
    startTransition(async () => {
      const result = await duplicateEvent(event.id);
      if (!result.ok) return void toast.error(t("failed"));
      toast.success(t("duplicated"));
      router.push(`/admin/events/${result.id}/details`);
    });
  }

  async function remove(event: Row) {
    const ok = await confirm({ title: t("deleteConfirm"), message: t("deleteText"), confirmLabel: t("delete"), danger: true });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteEvent(event.id);
      if (!result.ok) return void toast.error(t("failed"));
      toast.success(t("deleted"));
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-white px-6 py-14 text-center">
        <CalendarPlus className="mx-auto h-10 w-10 text-pink" aria-hidden />
        <p className="mt-4 text-lg font-extrabold text-ink">{t("empty")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className={cn(pending && "opacity-80 transition-opacity")}>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">{t("search")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            className="w-full rounded-full border border-border bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <select aria-label={t("filters.status")} value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={select}>
            <option value="all">{t("filters.status")} · {t("filters.all")}</option>
            <option value="draft">{t("status.draft")}</option>
            <option value="published">{t("status.published")}</option>
          </select>
          <select aria-label={t("filters.when")} value={when} onChange={(event) => setWhen(event.target.value as typeof when)} className={select}>
            <option value="all">{t("filters.when")} · {t("filters.all")}</option>
            <option value="past">{t("filters.past")}</option>
            <option value="upcoming">{t("filters.upcoming")}</option>
          </select>
          <select aria-label={t("filters.year")} value={year} onChange={(event) => setYear(event.target.value)} className={select}>
            <option value="all">{t("filters.year")} · {t("filters.allYears")}</option>
            {years.map((value) => (
              <option key={value} value={String(value)}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-3 text-xs font-semibold text-muted-foreground" aria-live="polite">
        {t("count", { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-card border border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">{t("noMatch")}</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((event) => {
            const featured = featuredState[event.id] ?? event.featured;
            return (
              <li key={event.id} className="flex flex-col gap-3 rounded-card border border-border bg-white p-3 sm:flex-row sm:items-center">
                <Link href={`/admin/events/${event.id}/details`} className="flex min-w-0 flex-1 items-center gap-4 rounded-xl focus-visible:outline-2 focus-visible:outline-blue">
                  <div className="relative aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-36">
                    {event.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                      <img
                        src={event.cover}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        style={{ objectPosition: `${event.focus.x}% ${event.focus.y}%` }}
                      />
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-1 text-[10px] font-bold text-muted-foreground">
                        <ImageOff className="h-5 w-5" aria-hidden />
                        {t("noCover")}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-ink">{event.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{dateFormat.format(new Date(event.startsAt))}</span>
                      {event.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {event.location}
                        </span>
                      )}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", statusClass[event.status])}>
                        {t(`status.${event.status}`)}
                      </span>
                      {event.upcoming && (
                        <span className="rounded-full bg-pink/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-pink">
                          {t("filters.upcoming")}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => toggleFeatured(event)}
                    aria-pressed={featured}
                    title={featured ? t("unfeature") : t("feature")}
                    aria-label={featured ? t("unfeature") : t("feature")}
                    className={cn("rounded-full p-2 hover:bg-muted", featured ? "text-[#f5a524]" : "text-muted-foreground")}
                  >
                    <Star className="h-4 w-4" fill={featured ? "currentColor" : "none"} />
                  </button>
                  <Link
                    href={`/admin/events/${event.id}/details`}
                    title={t("edit")}
                    aria-label={t("edit")}
                    className="rounded-full p-2 text-grey hover:bg-muted hover:text-blue"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  {event.status === "published" && (
                    <a
                      href={`/${locale}/events/${event.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title={t("view")}
                      aria-label={t("view")}
                      className="rounded-full p-2 text-grey hover:bg-muted hover:text-blue"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => duplicate(event)}
                    title={t("duplicate")}
                    aria-label={t("duplicate")}
                    className="rounded-full p-2 text-grey hover:bg-muted hover:text-blue"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(event)}
                    title={t("delete")}
                    aria-label={t("delete")}
                    className="rounded-full p-2 text-pink hover:bg-pink/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
