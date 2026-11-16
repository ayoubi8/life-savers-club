import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getEventForAdmin } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";
import { DetailsForm } from "./details-form";

export default async function EventDetailsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const [event, { data: forms }] = await Promise.all([
    getEventForAdmin(id),
    supabase.from("forms").select("id, title").eq("status", "published").eq("is_template", false).order("updated_at", { ascending: false }),
  ]);
  if (!event) notFound();

  return (
    <DetailsForm
      key={event.updated_at}
      event={{
        id: event.id,
        title_fr: event.title_fr,
        title_en: event.title_en ?? "",
        slug: event.slug,
        description_fr: event.description_fr ?? "",
        description_en: event.description_en ?? "",
        location: event.location ?? "",
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        cover_url: event.cover_url,
        cover_alt: event.cover_alt ?? "",
        cover_focus: event.cover_focus,
        tags: event.tags,
        stats: event.stats,
        attendee_count: event.attendee_count,
        registration_form_id: event.registration_form_id,
        show_registration: event.show_registration,
        social_links: event.social_links,
        featured: event.featured,
      }}
      library={event.media.filter((media) => media.kind === "image").map((media) => ({ id: media.id, url: media.url, alt: media.alt ?? "" }))}
      forms={(forms ?? []).map((form) => ({ id: form.id as string, title: form.title as string }))}
    />
  );
}
