import { createAdminClient } from "@/lib/supabase/admin";
import { parseSchema, type FormSchema } from "@/lib/forms/schema";
import { decryptSecret } from "./crypto";
import { appendValues, clearSheet, refreshAccessToken, rowValues, writeHeaderRow } from "./sheets";

const MAX_ATTEMPTS = 5;
const CHUNK = 400;

export type SyncResult = { ok: boolean; synced: number; failed: number; error?: string };

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;
type FormRow = { id: string; sheet_id: string | null; sheet_owner: string | null; schema: unknown };

function message(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 300);
}

/** A fresh access token for the Google account that owns this form's sheet. */
async function accessFor(admin: Admin, form: FormRow) {
  if (!form.sheet_id || !form.sheet_owner) throw new Error("not_connected");
  const { data: connection } = await admin
    .from("google_connections")
    .select("refresh_token_enc")
    .eq("user_id", form.sheet_owner)
    .maybeSingle();
  if (!connection?.refresh_token_enc) throw new Error("google_disconnected");
  const tokens = await refreshAccessToken(decryptSecret(connection.refresh_token_enc));
  return tokens.access_token;
}

async function loadForm(admin: Admin, formId: string) {
  const { data } = await admin
    .from("forms")
    .select("id, sheet_id, sheet_owner, schema")
    .eq("id", formId)
    .maybeSingle();
  return (data as FormRow | null) ?? null;
}

/**
 * Drains queued rows into their Google Sheet. One append per form, so a batch costs one API call.
 * Failed jobs are kept with their error and retried until MAX_ATTEMPTS.
 */
export async function syncPending(options: { formId?: string; responseId?: string; limit?: number; olderThanSeconds?: number } = {}): Promise<SyncResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, synced: 0, failed: 0, error: "service_role_missing" };

  let query = admin
    .from("sheet_sync_jobs")
    .select("id, response_id, form_id, attempts")
    .neq("status", "done")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(options.limit ?? 200);
  if (options.formId) query = query.eq("form_id", options.formId);
  if (options.responseId) query = query.eq("response_id", options.responseId);
  // The cron skips brand-new rows: the submit request is already syncing them.
  if (options.olderThanSeconds) query = query.lt("created_at", new Date(Date.now() - options.olderThanSeconds * 1000).toISOString());
  const { data: jobs } = await query;
  if (!jobs || jobs.length === 0) return { ok: true, synced: 0, failed: 0 };

  const byForm = new Map<string, typeof jobs>();
  for (const job of jobs) byForm.set(job.form_id, [...(byForm.get(job.form_id) ?? []), job]);

  let synced = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (const [formId, formJobs] of byForm) {
    const ids = formJobs.map((job) => job.id);
    try {
      const form = await loadForm(admin, formId);
      if (!form) throw new Error("form_missing");
      const token = await accessFor(admin, form);
      const schema = parseSchema(form.schema);

      const { data: responses } = await admin
        .from("responses")
        .select("id, answers, created_at")
        .in("id", formJobs.map((job) => job.response_id))
        .order("created_at", { ascending: true });

      await writeHeaderRow(form.sheet_id!, token, schema);
      await appendValues(
        form.sheet_id!,
        token,
        (responses ?? []).map((row) => rowValues(schema, (row.answers ?? {}) as Record<string, unknown>, row.created_at)),
      );

      const now = new Date().toISOString();
      await admin.from("sheet_sync_jobs").update({ status: "done", processed_at: now, last_error: null }).in("id", ids);
      await admin.from("responses").update({ synced_to_sheet: true }).in("id", formJobs.map((job) => job.response_id));
      await admin.from("forms").update({ sheet_last_synced_at: now }).eq("id", formId);
      synced += formJobs.length;
    } catch (error) {
      lastError = message(error);
      failed += formJobs.length;
      for (const job of formJobs) {
        await admin
          .from("sheet_sync_jobs")
          .update({ status: "failed", attempts: job.attempts + 1, last_error: lastError, processed_at: new Date().toISOString() })
          .eq("id", job.id);
      }
    }
  }

  return { ok: failed === 0, synced, failed, error: lastError };
}

/** Failed jobs go back in the queue with a fresh attempt counter, then run now. */
export async function retryFailed(formId: string): Promise<SyncResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, synced: 0, failed: 0, error: "service_role_missing" };
  await admin
    .from("sheet_sync_jobs")
    .update({ status: "pending", attempts: 0 })
    .eq("form_id", formId)
    .eq("status", "failed");
  return syncPending({ formId });
}

/**
 * Rewrites the whole sheet from the database: fixes columns after questions were reordered or
 * removed, and sends responses that arrived before the sheet was connected.
 */
export async function rebuildSheet(formId: string): Promise<SyncResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, synced: 0, failed: 0, error: "service_role_missing" };

  try {
    const form = await loadForm(admin, formId);
    if (!form) throw new Error("form_missing");
    const token = await accessFor(admin, form);
    const schema: FormSchema = parseSchema(form.schema);

    await clearSheet(form.sheet_id!, token);
    await writeHeaderRow(form.sheet_id!, token, schema);

    let synced = 0;
    for (let from = 0; ; from += CHUNK) {
      const { data: rows } = await admin
        .from("responses")
        .select("answers, created_at")
        .eq("form_id", formId)
        .order("created_at", { ascending: true })
        .range(from, from + CHUNK - 1);
      if (!rows || rows.length === 0) break;
      await appendValues(
        form.sheet_id!,
        token,
        rows.map((row) => rowValues(schema, (row.answers ?? {}) as Record<string, unknown>, row.created_at)),
      );
      synced += rows.length;
      if (rows.length < CHUNK) break;
    }

    const now = new Date().toISOString();
    await admin.from("responses").update({ synced_to_sheet: true }).eq("form_id", formId);
    await admin
      .from("sheet_sync_jobs")
      .update({ status: "done", processed_at: now, last_error: null })
      .eq("form_id", formId)
      .neq("status", "done");
    await admin.from("forms").update({ sheet_last_synced_at: now }).eq("id", formId);
    return { ok: true, synced, failed: 0 };
  } catch (error) {
    return { ok: false, synced: 0, failed: 0, error: message(error) };
  }
}
