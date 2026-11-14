import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { parseSchema } from "@/lib/forms/schema";

/**
 * One query per request, shared by the layout and the route pages. The response
 * count and the published snapshot ride along as embeds, so the builder layout
 * needs a single database round trip.
 */
export const getForm = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("forms")
    .select(
      "id, slug, title, status, schema, settings, sheet_id, opens_at, closes_at, updated_at, published_version_id, sheet_last_synced_at, theme, cover_url, logo_url, responses(count), live:form_versions!forms_published_version_id_fkey(schema)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { responses, live, ...form } = data as typeof data & {
    responses: { count: number }[] | null;
    live: { schema: unknown } | null;
  };
  return {
    ...form,
    responseCount: Number(responses?.[0]?.count ?? 0),
    /** Canonical JSON of the published snapshot, or null when the form was never published. */
    liveBase: live ? JSON.stringify(parseSchema(live.schema)) : null,
  };
});

export async function getOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return (process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`).replace(/\/+$/, "");
}
