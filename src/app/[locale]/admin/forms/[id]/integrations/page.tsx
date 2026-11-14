import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getForm } from "@/lib/forms/queries";
import { isUuid } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";
import { isGoogleConfigured } from "@/lib/google/config";
import { IntegrationsPanel } from "../integrations-panel";

export default async function IntegrationsPage({
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
  // The health counts only need the id, so they run alongside the form query.
  const supabase = await createClient();
  const count = async (status: "pending" | "failed" | "done") =>
    (await supabase.from("sheet_sync_jobs").select("id", { count: "exact", head: true }).eq("form_id", id).eq("status", status)).count ?? 0;
  const [form, pending, failed, notSynced, lastFailed] = await Promise.all([
    getForm(id),
    count("pending"),
    count("failed"),
    supabase.from("responses").select("id", { count: "exact", head: true }).eq("form_id", id).eq("synced_to_sheet", false),
    supabase
      .from("sheet_sync_jobs")
      .select("last_error")
      .eq("form_id", id)
      .eq("status", "failed")
      .order("processed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!form) notFound();

  const notice =
    query.connected === "1" ? "connected" : typeof query.error === "string" ? "error" : null;

  return (
    <IntegrationsPanel
      formId={form.id}
      locale={locale}
      sheetId={form.sheet_id}
      configured={isGoogleConfigured()}
      notice={notice}
      health={{
        pending,
        failed,
        notSynced: notSynced.count ?? 0,
        lastSyncedAt: form.sheet_last_synced_at,
        lastError: lastFailed.data?.last_error ?? null,
      }}
    />
  );
}
