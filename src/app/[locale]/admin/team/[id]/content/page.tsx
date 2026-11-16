import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getDepartmentForAdmin } from "@/lib/team/queries";
import { ContentEditorLoader } from "../../../events/[id]/content/content-loader";

/** "What we do": the same rich editor as event pages, saving to the department. */
export default async function DepartmentContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ locale, id }, { lang }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const department = await getDepartmentForAdmin(id);
  if (!department) notFound();
  const editorLang = lang === "en" ? "en" : "fr";

  return (
    <ContentEditorLoader
      key={`${editorLang}-${department.updated_at}`}
      target={{ kind: "department", id: department.id }}
      lang={editorLang}
      docs={{ fr: department.content_fr, en: department.content_en }}
      updatedAt={department.updated_at}
      library={department.media.map((media) => ({
        id: media.id,
        url: media.url,
        kind: "image" as const,
        alt: media.alt ?? "",
        width: media.width,
        height: media.height,
      }))}
    />
  );
}
