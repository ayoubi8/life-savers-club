import { setRequestLocale } from "next-intl/server";
import { EditorView } from "../editor-view";

export default async function EditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <EditorView />;
}
