import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getForm } from "@/lib/forms/queries";
import { DISPLAY_TYPES, isUuid, parseSchema, schemaFields } from "@/lib/forms/schema";
import { SettingsPanel } from "../settings-panel";

export default async function SettingsPage({
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
    <SettingsPanel
      locale={locale}
      fields={schemaFields(parseSchema(form.schema))
        .filter((field) => !DISPLAY_TYPES.includes(field.type))
        .map((field) => ({ id: field.id, label: field.label || field.type, type: field.type }))}
      form={{
        id: form.id,
        slug: form.slug,
        title: form.title,
        status: form.status,
        schema: form.schema,
        settings: form.settings,
        sheetId: form.sheet_id,
        opensAt: form.opens_at,
        closesAt: form.closes_at,
      }}
    />
  );
}
