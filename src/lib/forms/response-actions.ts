"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/auth";
import { DISPLAY_TYPES, isUuid, parseSchema, parseSettings, schemaFields } from "./schema";
import { RESPONSE_STATUSES, type ResponseStatus } from "./responses-query";

type Result = { ok: boolean; error?: string };

/** Forms team or admins. RLS enforces the same on the database side. */
async function leader() {
  const context = await requireSection("forms");
  if (!context) return null;
  return { supabase: context.supabase, userId: context.profile.id };
}

function cleanIds(ids: string[]) {
  return [...new Set(ids)].filter(isUuid).slice(0, 500);
}

export async function setResponseStatus(
  ids: string[],
  status: ResponseStatus,
  note?: string,
): Promise<Result> {
  const context = await leader();
  if (!context) return { ok: false, error: "unauthorized" };
  const list = cleanIds(ids);
  if (list.length === 0 || !RESPONSE_STATUSES.includes(status)) return { ok: false, error: "invalid" };

  const patch: Record<string, unknown> = {
    status,
    reviewed_by: status === "new" ? null : context.userId,
    reviewed_at: status === "new" ? null : new Date().toISOString(),
  };
  if (note !== undefined) patch.review_note = note.slice(0, 2000) || null;

  const { error } = await context.supabase.from("responses").update(patch).in("id", list);
  if (error) return { ok: false, error: "update_failed" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveResponseNote(id: string, note: string): Promise<Result> {
  const context = await leader();
  if (!context || !isUuid(id)) return { ok: false, error: "unauthorized" };
  const { error } = await context.supabase
    .from("responses")
    .update({ review_note: note.slice(0, 2000) || null })
    .eq("id", id);
  return error ? { ok: false, error: "update_failed" } : { ok: true };
}

export async function deleteResponses(ids: string[]): Promise<Result> {
  const context = await leader();
  if (!context) return { ok: false, error: "unauthorized" };
  const list = cleanIds(ids);
  if (list.length === 0) return { ok: false, error: "invalid" };
  const { error } = await context.supabase.from("responses").delete().in("id", list);
  if (error) return { ok: false, error: "delete_failed" };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Fresh signed link (the ones rendered with the page expire after an hour). */
export async function signResponseFile(formId: string, path: string): Promise<{ url?: string }> {
  const context = await leader();
  if (!context || !isUuid(formId) || !path.startsWith(`${formId}/`) || path.includes("..")) return {};
  const { data } = await context.supabase.storage.from("form-uploads").createSignedUrl(path, 600);
  return { url: data?.signedUrl };
}

/** Accept a response and add the person to the members list (membership forms). */
export async function acceptAndCreateMember(responseId: string): Promise<Result & { memberCreated?: boolean }> {
  const context = await leader();
  if (!context || !isUuid(responseId)) return { ok: false, error: "unauthorized" };

  const { data: response } = await context.supabase
    .from("responses")
    .select("id, form_id, answers, respondent_name, respondent_email")
    .eq("id", responseId)
    .maybeSingle();
  if (!response) return { ok: false, error: "not_found" };

  const { data: form } = await context.supabase
    .from("forms")
    .select("schema, settings")
    .eq("id", response.form_id)
    .maybeSingle();
  if (!form) return { ok: false, error: "not_found" };

  const schema = parseSchema(form.schema);
  const fields = schemaFields(schema).filter((field) => !DISPLAY_TYPES.includes(field.type));
  const settings = parseSettings(form.settings);
  const answers = (response.answers ?? {}) as Record<string, unknown>;

  const text = (id: string | undefined) => {
    if (!id) return null;
    const value = answers[id];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  const phoneField = fields.find((field) => field.type === "phone");
  const extra: Record<string, unknown> = {};
  for (const field of fields) {
    const value = answers[field.id];
    if (value != null && typeof value !== "object") extra[field.label || field.id] = value;
  }

  const fullName = response.respondent_name || text(settings.respondentNameField) || response.respondent_email;
  let memberCreated = false;
  if (fullName) {
    const email = response.respondent_email?.toLowerCase() ?? null;
    const existing = email
      ? await context.supabase.from("members").select("id").ilike("email", email).maybeSingle()
      : { data: null };
    if (!existing.data) {
      const { error } = await context.supabase.from("members").insert({
        full_name: fullName,
        email,
        phone: text(phoneField?.id),
        source_response_id: response.id,
        extra,
      });
      memberCreated = !error;
    }
  }

  const status = await setResponseStatus([responseId], "accepted");
  return { ok: status.ok, error: status.error, memberCreated };
}
