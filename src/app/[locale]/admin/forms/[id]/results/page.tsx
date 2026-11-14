import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getForm } from "@/lib/forms/queries";
import { DISPLAY_TYPES, isUuid, parseSchema, schemaFields } from "@/lib/forms/schema";
import {
  fetchResponses,
  parseFilters,
  summarize,
  type ResponseRow,
} from "@/lib/forms/responses-query";
import { ResultsPanel } from "../results-panel";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  if (!isUuid(id)) notFound();
  const form = await getForm(id);
  if (!form) notFound();

  const supabase = await createClient();
  const schema = parseSchema(form.schema);
  const fields = schemaFields(schema).filter((field) => !DISPLAY_TYPES.includes(field.type));
  const filters = parseFilters(query);

  const summaryView = filters.view === "summary";
  const { rows, total, truncated } = await fetchResponses(
    supabase,
    form.id,
    schema,
    filters,
    summaryView ? "all" : "page",
  );

  // Deep link: ?r=<response id> opens the detail drawer, even if it is not on this page.
  const openId = typeof query.r === "string" && isUuid(query.r) ? query.r : null;
  let openRow: ResponseRow | null = rows.find((row) => row.id === openId) ?? null;
  if (openId && !openRow) {
    const { data } = await supabase
      .from("responses")
      .select("id, answers, respondent_name, respondent_email, created_at, synced_to_sheet, status, review_note")
      .eq("id", openId)
      .eq("form_id", form.id)
      .maybeSingle();
    openRow = (data as ResponseRow | null) ?? null;
  }

  return (
    <ResultsPanel
      formId={form.id}
      locale={locale}
      fields={fields}
      rows={summaryView ? [] : rows}
      total={total}
      truncated={truncated}
      filters={filters}
      summary={summaryView ? summarize(schema, rows) : null}
      openRow={openRow}
    />
  );
}
