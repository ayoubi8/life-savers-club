import { redirect } from "next/navigation";

/** The bare event URL opens the Details tab. */
export default async function EventIndex({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect(`/${locale}/admin/events/${id}/details`);
}
