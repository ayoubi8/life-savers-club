import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getForm, getOrigin } from "@/lib/forms/queries";
import { isUuid, parseSchema } from "@/lib/forms/schema";
import { BuilderHeader } from "./builder-header";
import { BuilderProvider } from "./builder-provider";

export default async function FormLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isUuid(id)) notFound();

  const [form, origin] = await Promise.all([getForm(id), getOrigin()]);
  if (!form) notFound();
  const { responseCount: count, liveBase } = form;

  return (
    <BuilderProvider
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
      baseSchema={JSON.stringify(parseSchema(form.schema))}
      liveBase={liveBase}
    >
      <div className="mx-auto max-w-6xl">
        <BuilderHeader
          publicUrl={`${origin}/${locale}/f/${form.slug}`}
          responseCount={count}
          locale={locale}
        />
        <div className="py-6">{children}</div>
      </div>
    </BuilderProvider>
  );
}
