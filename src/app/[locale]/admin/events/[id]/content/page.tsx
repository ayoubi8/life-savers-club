import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getEventForAdmin } from "@/lib/events/queries";
import { ContentEditorLoader } from "./content-loader";

export default async function EventContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ locale, id }, { lang }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const event = await getEventForAdmin(id);
  if (!event) notFound();
  const editorLang = lang === "en" ? "en" : "fr";

  return (
    <ContentEditorLoader
      key={`${editorLang}-${event.updated_at}`}
      target={{ kind: "event", id: event.id }}
      lang={editorLang}
      docs={{ fr: event.content_fr, en: event.content_en }}
      updatedAt={event.updated_at}
      library={event.media.map((media) => ({
        id: media.id,
        url: media.url,
        kind: media.kind,
        alt: media.alt ?? "",
        width: media.width,
        height: media.height,
      }))}
    />
  );
}
