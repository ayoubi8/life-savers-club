import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getForm, getOrigin } from "@/lib/forms/queries";
import { isUuid } from "@/lib/forms/schema";
import { SharePanel } from "../share-panel";

export default async function SharePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isUuid(id)) notFound();
  const form = await getForm(id);
  if (!form) notFound();
  const origin = await getOrigin();

  return (
    <SharePanel
      publicUrl={`${origin}/${locale}/f/${form.slug}`}
      title={form.title}
      slug={form.slug}
      published={form.status === "published"}
      settingsHref={`/admin/forms/${form.id}/settings`}
    />
  );
}
