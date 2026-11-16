import { CalendarPlus, ClipboardPen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { googleCalendarUrl } from "@/lib/events/ics";
import { SOCIAL_NETWORKS, type EventFull } from "@/lib/events/types";
import { EventShare } from "./event-share";
import { SOCIAL_NAMES, SocialIcon } from "./social-icons";

/**
 * Bar under the event header. Upcoming events: "S'inscrire" (when a published registration
 * form is linked and shown) and "Add to calendar". Every event: links to its own posts on
 * Instagram / Facebook / TikTok (when set in the admin) and share buttons.
 */
export async function EventActions({
  event,
  title,
  summary,
  url,
  locale,
}: {
  event: EventFull;
  title: string;
  summary: string;
  url: string;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "eventPage" });
  const register = event.upcoming && event.show_registration && event.registration_form_slug;
  const calendar = {
    id: event.id,
    title,
    description: summary,
    location: event.location,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    url,
  };
  // Links to the event's own posts, in a fixed order, only the ones the admin filled in.
  const socials = SOCIAL_NETWORKS.flatMap((network) => {
    const href = event.social_links[network];
    return href ? [[network, href] as const] : [];
  });
  const outline =
    "inline-flex h-11 items-center gap-2 rounded-full border-2 border-[var(--event-link)] px-5 text-sm font-extrabold text-[var(--event-link)] transition hover:opacity-80";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="flex flex-col gap-4 rounded-[var(--form-card-radius,1rem)] border border-current/10 p-4 sm:p-5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        {event.upcoming && (
          <div className="flex flex-wrap items-center gap-2">
            {register && (
              <Link
                href={`/f/${event.registration_form_slug}`}
                className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-extrabold text-white shadow-lg transition hover:opacity-90"
                style={{ background: "var(--event-primary)" }}
              >
                <ClipboardPen className="h-4 w-4" aria-hidden />
                {t("register")}
              </Link>
            )}
            <a href={`/api/events/${event.slug}/ics${locale === "en" ? "?lang=en" : ""}`} download={`${event.slug}.ics`} className={outline}>
              <CalendarPlus className="h-4 w-4" aria-hidden />
              {t("addToCalendar")}
            </a>
            <a
              href={googleCalendarUrl(calendar)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 text-sm font-bold underline decoration-2 underline-offset-4 opacity-80 hover:opacity-100"
            >
              {t("googleCalendar")}
            </a>
          </div>
        )}
        {socials.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-bold opacity-75">{t("followTitle")}</span>
            {socials.map(([network, href]) => (
              <a
                key={network}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-current/15 px-3.5 text-sm font-bold transition hover:border-[var(--event-link)] hover:text-[var(--event-link)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--event-link)]"
              >
                <SocialIcon network={network} />
                <span>
                  <span className="sr-only">{t("viewOn", { network: SOCIAL_NAMES[network] })}</span>
                  <span aria-hidden>{SOCIAL_NAMES[network]}</span>
                </span>
              </a>
            ))}
          </div>
        )}
        <EventShare
          url={url}
          text={title}
          labels={{
            title: t("share"),
            copy: t("copyLink"),
            copied: t("copied"),
            copyFailed: t("copyFailed"),
            via: t("shareOn", { network: "%s" }),
            more: t("shareMore"),
          }}
        />
      </div>
    </div>
  );
}
