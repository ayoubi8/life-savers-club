import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventActions } from "@/components/events/event-actions";
import { EventContent } from "@/components/events/event-content";
import { EventGallery } from "@/components/events/event-gallery";
import { EventHero } from "@/components/events/event-hero";
import { EventStats } from "@/components/events/event-stats";
import { Link } from "@/i18n/navigation";
import { docMediaUrls, isEmptyDoc } from "@/lib/events/content";
import { getAdjacentEvents, getEventBySlug } from "@/lib/events/queries";
import { eventJsonLd, serializeJsonLd } from "@/lib/events/seo";
import { eventThemeStyle } from "@/lib/events/theme";
import type { EventFull } from "@/lib/events/types";
import { localized } from "@/lib/events/utils";
import { getOrigin } from "@/lib/forms/queries";

type Props = { params: Promise<{ locale: string; slug: string }> };

/** Width / height of the cover when it comes from the event's media library (better link previews). */
function coverSize(event: EventFull) {
  const media = event.media.find((item) => item.url === event.cover_url);
  return media?.width && media.height ? { width: media.width, height: media.height } : {};
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = await getEventBySlug(slug);
  if (!result) return {};
  const { event, preview } = result;
  const title = localized(event.title_fr, event.title_en, locale);
  const description = localized(event.description_fr, event.description_en, locale) || undefined;
  const origin = await getOrigin();
  const url = `${origin}/${locale}/events/${event.slug}`;
  const images = event.cover_url ? [{ url: event.cover_url, alt: event.cover_alt || title, ...coverSize(event) }] : undefined;
  return {
    title,
    description,
    robots: preview ? { index: false, follow: false } : undefined,
    alternates: {
      canonical: url,
      languages: { fr: `${origin}/fr/events/${event.slug}`, en: `${origin}/en/events/${event.slug}` },
    },
    openGraph: {
      type: "article",
      url,
      siteName: "Life Savers Club",
      locale: locale === "en" ? "en_US" : "fr_FR",
      title,
      description,
      publishedTime: event.starts_at,
      modifiedTime: event.updated_at,
      tags: event.tags,
      images,
    },
    twitter: { card: event.cover_url ? "summary_large_image" : "summary", title, description, images: images?.map((image) => image.url) },
  };
}

export default async function EventPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const result = await getEventBySlug(slug);
  if (!result) notFound();
  const { event, preview } = result;

  const [t, adjacent, origin] = await Promise.all([
    getTranslations({ locale, namespace: "eventPage" }),
    getAdjacentEvents(event.starts_at),
    getOrigin(),
  ]);
  const url = `${origin}/${locale}/events/${event.slug}`;

  const title = localized(event.title_fr, event.title_en, locale);
  const summary = localized(event.description_fr, event.description_en, locale);
  const doc = locale === "en" && !isEmptyDoc(event.content_en) ? event.content_en : event.content_fr;
  const dims = Object.fromEntries(event.media.map((media) => [media.url, { width: media.width, height: media.height }]));

  // Library photos and videos not already shown (cover at the top, or placed in the content)
  // are collected in a "Galerie" / "Vidéos" section at the end.
  const used = docMediaUrls(doc);
  if (event.cover_url) used.add(event.cover_url);
  const photos = event.media
    .filter((media) => media.kind === "image" && !used.has(media.url))
    .map((media) => ({ src: media.url, alt: media.alt || title, caption: media.caption ?? undefined, width: media.width, height: media.height }));
  const videos = event.media.filter((media) => media.kind === "video" && !used.has(media.url));

  return (
    <div className="event-theme pb-20" style={eventThemeStyle(event.theme)}>
      {!preview && (
        <script
          type="application/ld+json"
          // JSON-LD as recommended by Next.js (escaped by serializeJsonLd).
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventJsonLd(event, title, summary, url, origin)) }}
        />
      )}
      {preview && (
        <p role="status" className="flex items-center justify-center gap-2 bg-[#fff4d6] px-4 py-2.5 text-center text-sm font-bold text-[#7a5200]">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          {t("previewBanner")}
        </p>
      )}

      <EventHero
        event={event}
        title={title}
        summary={summary}
        locale={locale}
        attendeesLabel={event.attendee_count ? t("attendees", { count: event.attendee_count }) : null}
        mapLabel={t("map")}
      />

      <div className="mt-8 space-y-12 sm:mt-10">
        <EventActions event={event} title={title} summary={summary} url={url} locale={locale} />

        <EventStats stats={event.stats} locale={locale} label={t("keyNumbers")} />

        {!isEmptyDoc(doc) && (
          <article className="mx-auto max-w-3xl px-4 sm:px-6">
            <EventContent doc={doc} dims={dims} />
          </article>
        )}

        {photos.length > 0 && (
          <section aria-labelledby="gallery-title" className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="gallery-title" className="mb-5 text-2xl font-extrabold sm:text-3xl">{t("gallery")}</h2>
            <EventGallery images={photos} layout={photos.length >= 6 ? "masonry" : "grid"} columns={photos.length === 2 || photos.length === 4 ? 2 : 3} />
          </section>
        )}

        {videos.length > 0 && (
          <section aria-labelledby="videos-title" className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 id="videos-title" className="mb-5 text-2xl font-extrabold sm:text-3xl">{t("videos")}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {videos.map((video) => (
                <video
                  key={video.id}
                  src={video.url}
                  controls
                  preload="metadata"
                  playsInline
                  aria-label={video.alt || t("video")}
                  className="w-full rounded-[var(--form-card-radius,1rem)] bg-black"
                />
              ))}
            </div>
          </section>
        )}

        <nav aria-label={t("back")} className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-3 border-t border-current/10 pt-8 sm:grid-cols-2">
            {adjacent.older ? (
              <Link
                href={`/events/${adjacent.older.slug}`}
                className="group rounded-[var(--form-card-radius,1rem)] border border-current/10 p-4 transition hover:border-[var(--event-primary)]"
              >
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide opacity-70">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  {t("previous")}
                </span>
                <span className="mt-1 block font-extrabold group-hover:text-[var(--event-link)]">
                  {localized(adjacent.older.title_fr, adjacent.older.title_en, locale)}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {adjacent.newer && (
              <Link
                href={`/events/${adjacent.newer.slug}`}
                className="group rounded-[var(--form-card-radius,1rem)] border border-current/10 p-4 text-right transition hover:border-[var(--event-primary)]"
              >
                <span className="flex items-center justify-end gap-1 text-xs font-bold uppercase tracking-wide opacity-70">
                  {t("next")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="mt-1 block font-extrabold group-hover:text-[var(--event-link)]">
                  {localized(adjacent.newer.title_fr, adjacent.newer.title_en, locale)}
                </span>
              </Link>
            )}
          </div>
          <p className="mt-8 text-center">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-extrabold text-white shadow-lg transition hover:opacity-90"
              style={{ background: "var(--event-primary)" }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("back")}
            </Link>
          </p>
        </nav>
      </div>
    </div>
  );
}
