import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  firstPage,
  parseSchema,
  parseSettings,
} from "@/lib/forms/schema";
import { PublicForm } from "@/components/forms/public-form";
import { FormShell } from "@/components/forms/form-shell";
import { pageTextClass, parseTheme } from "@/lib/forms/theme";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: form } = await supabase
    .from("forms")
    .select("title")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return { title: form?.title ?? "Form" };
}

function resolveClosed(opensAt: string | null, closesAt: string | null) {
  const now = Date.now();
  const notOpenYet = opensAt ? new Date(opensAt).getTime() > now : false;
  const closedByDate = closesAt ? new Date(closesAt).getTime() < now : false;
  return notOpenYet || closedByDate;
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: form } = await supabase
    .from("forms")
    .select("id, slug, title, status, schema, settings, opens_at, closes_at, published_version_id, theme, cover_url, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!form) notFound();

  // Drafts are visible only to active leaders, as a non-submittable preview.
  let preview = false;
  if (form.status !== "published") {
    const { profile: me } = await getSessionProfile();
    if (me?.status !== "active") notFound();
    preview = true;
  }

  const t = await getTranslations({ locale, namespace: "formPublic" });
  // Visitors see the published snapshot; leaders previewing a draft see the live edits.
  let schemaSource: unknown = form.schema;
  if (!preview && form.published_version_id) {
    const { data: version } = await supabase
      .from("form_versions")
      .select("schema")
      .eq("id", form.published_version_id)
      .maybeSingle();
    if (version) schemaSource = version.schema;
  }
  const schema = parseSchema(schemaSource);
  const pageData = firstPage(schema);
  const settings = parseSettings(form.settings);

  const closed = resolveClosed(form.opens_at, form.closes_at);

  const theme = parseTheme(form.theme);

  return (
    <FormShell
      theme={theme}
      coverUrl={form.cover_url}
      logoUrl={form.logo_url}
      title={form.title}
      description={pageData.description}
      banner={
        preview ? (
          <p className="mb-4 rounded-xl border border-pink/30 bg-white px-4 py-3 text-center text-sm font-bold text-pink shadow-soft">
            {t("draftBanner")}
          </p>
        ) : null
      }
      footer={
        <p className={`mt-6 flex items-center justify-center gap-2 text-center text-xs ${pageTextClass(theme)}`}>
          <Link href="/" className="inline-flex items-center gap-2 hover:underline">
            <Image src="/brand/logo.png" alt="" width={22} height={18} className="rounded-full bg-white" />
            {t("poweredBy")}
          </Link>
        </p>
      }
    >
      <PublicForm
        formId={form.id}
        schema={schema}
        submitLabel={settings.submitLabel || t("submit")}
        successTitle={settings.successTitle || t("successTitle")}
        successMessage={settings.successMessage || t("successText")}
        closed={closed}
        preview={preview}
        layout={settings.layout}
        allowAnother={!settings.onePerEmail && settings.maxResponses === null}
      />
    </FormShell>
  );
}
