import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getForm } from "@/lib/forms/queries";
import { isUuid } from "@/lib/forms/schema";
import { parseTheme } from "@/lib/forms/theme";
import { DesignPanel } from "../design-panel";

export default async function DesignPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isUuid(id)) notFound();
  const form = await getForm(id);
  if (!form) notFound();

  return (
    <DesignPanel
      formId={form.id}
      initialTheme={parseTheme(form.theme)}
      initialCover={form.cover_url}
      initialLogo={form.logo_url}
    />
  );
}
