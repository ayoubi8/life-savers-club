"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rebuildSheet, retryFailed, syncPending, type SyncResult } from "@/lib/google/sync";
import { buildTemplate, isTemplateKey } from "./templates";
import { parseTheme } from "./theme";
import {
  CHOICE_TYPES,
  DEFAULT_SETTINGS,
  type FieldType,
  type FormField,
  isUuid,
  parseSchema,
  parseSettings,
  DISPLAY_TYPES, firstInvalidField, schemaFields,
  slugify,
  uid,
  validateSchema,
} from "./schema";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type FormActionState = { error?: string; ok?: boolean };
type SubmitState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: string; fieldId?: string };

/** Forms team (members with the "forms" section) or admins. RLS enforces the same rule. */
async function getLeader() {
  const context = await requireSection("forms");
  if (!context) return null;
  return { ...context, user: { id: context.profile.id } };
}

async function uniqueSlug(supabase: ServerClient, base: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await supabase.from("forms").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function readString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createForm(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const locale = readString(formData, "locale") || "fr";
  const context = await getLeader();
  if (!context) redirect(`/${locale}/login`);

  const title = readString(formData, "title");
  if (!title) return { error: "title_required" };
  if (title.length > 200) return { error: "title_too_long" };

  const requested = readString(formData, "slug");
  let base = slugify(requested || title);
  if (!base) base = `form-${Date.now().toString(36)}`;
  const slug = await uniqueSlug(context.supabase, base);

  // Start from a built-in template ("membership"…), one of the leader's saved templates ("tpl:<id>"), or blank.
  const choice = readString(formData, "template") || "blank";
  let schema: unknown = buildTemplate("blank", locale).schema;
  let settings: unknown = DEFAULT_SETTINGS;
  let kind = "generic";
  let theme: unknown = {};
  let description: string | null = null;

  if (choice.startsWith("tpl:")) {
    const templateId = choice.slice(4);
    if (!isUuid(templateId)) return { error: "create_failed" };
    const { data: source } = await context.supabase
      .from("forms")
      .select("schema, settings, theme, kind, description")
      .eq("id", templateId)
      .eq("is_template", true)
      .maybeSingle();
    if (!source) return { error: "create_failed" };
    schema = source.schema;
    settings = source.settings;
    theme = source.theme;
    kind = source.kind;
    description = source.description;
  } else if (isTemplateKey(choice)) {
    const built = buildTemplate(choice, locale);
    schema = built.schema;
    settings = built.settings;
    kind = built.kind;
  }

  const { data, error } = await context.supabase
    .from("forms")
    .insert({
      slug,
      title,
      status: "draft",
      kind,
      schema,
      theme,
      description,
      settings,
      created_by: context.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "create_failed" };
  redirect(`/${locale}/admin/forms/${data.id}/edit`);
}

/** Copy a form as a new draft ("copy") or keep the copy as a reusable template ("template"). */
export async function duplicateForm(formData: FormData) {
  const id = readString(formData, "id");
  const locale = readString(formData, "locale") || "fr";
  const mode = readString(formData, "mode") === "template" ? "template" : "copy";
  const context = await getLeader();
  if (!context) redirect(`/${locale}/login`);
  if (!isUuid(id)) redirect(`/${locale}/admin/forms`);

  const { data: source } = await context.supabase
    .from("forms")
    .select("title, schema, settings, theme, kind, description, cover_url, logo_url")
    .eq("id", id)
    .maybeSingle();
  if (!source) redirect(`/${locale}/admin/forms`);

  const title = mode === "copy" ? `${source.title} (${locale === "en" ? "copy" : "copie"})`.slice(0, 200) : source.title;
  const slug = await uniqueSlug(context.supabase, slugify(title) || `form-${Date.now().toString(36)}`);

  const { data, error } = await context.supabase
    .from("forms")
    .insert({
      slug,
      title,
      status: "draft",
      kind: source.kind,
      schema: source.schema,
      settings: source.settings,
      theme: source.theme,
      description: source.description,
      cover_url: source.cover_url,
      logo_url: source.logo_url,
      is_template: mode === "template",
      created_by: context.user.id,
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/${locale}/admin/forms?error=duplicate_failed`);
  redirect(mode === "template" ? `/${locale}/admin/forms?saved=template` : `/${locale}/admin/forms/${data.id}/edit`);
}

export async function deleteForm(formData: FormData) {
  const id = readString(formData, "id");
  const locale = readString(formData, "locale") || "fr";
  const context = await getLeader();
  if (!context) redirect(`/${locale}/login`);
  if (!isUuid(id)) redirect(`/${locale}/admin/forms`);

  await context.supabase.from("forms").delete().eq("id", id);
  redirect(`/${locale}/admin/forms`);
}

export type SaveSchemaResult =
  | { ok: true; base: string; savedAt: string }
  | { ok: false; error: string };

/**
 * Autosave entry point. `base` is the canonical JSON of the schema the client last
 * loaded/saved; if the stored schema differs, someone else edited it ("conflict").
 * Pass base = null to overwrite.
 */
export async function saveSchema(
  formId: string,
  input: unknown,
  base: string | null,
): Promise<SaveSchemaResult> {
  const context = await getLeader();
  if (!context) return { ok: false, error: "unauthorized" };
  if (!isUuid(formId)) return { ok: false, error: "save_failed" };

  const result = validateSchema(input, false);
  if (!result.ok) return { ok: false, error: result.error };

  if (base !== null) {
    const { data: current } = await context.supabase
      .from("forms")
      .select("schema")
      .eq("id", formId)
      .maybeSingle();
    if (!current) return { ok: false, error: "save_failed" };
    if (JSON.stringify(parseSchema(current.schema)) !== base) {
      return { ok: false, error: "conflict" };
    }
  }

  const { data, error } = await context.supabase
    .from("forms")
    .update({ schema: result.schema })
    .eq("id", formId)
    .select("updated_at")
    .single();

  if (error || !data) return { ok: false, error: "save_failed" };
  return {
    ok: true,
    base: JSON.stringify(parseSchema(result.schema)),
    savedAt: data.updated_at,
  };
}

export type PublishResult =
  | { ok: true; base: string }
  | { ok: false; error: string; fieldId?: string; reason?: string; label?: string };

/** Publishing snapshots the current questions (public pages render the snapshot). */
export async function publishForm(formId: string): Promise<PublishResult> {
  const context = await getLeader();
  if (!context) return { ok: false, error: "unauthorized" };
  if (!isUuid(formId)) return { ok: false, error: "save_failed" };

  const { data: form } = await context.supabase
    .from("forms")
    .select("schema")
    .eq("id", formId)
    .maybeSingle();
  if (!form) return { ok: false, error: "save_failed" };

  const schema = parseSchema(form.schema);
  const invalid = firstInvalidField(schema);
  if (invalid) {
    return { ok: false, error: "invalid_question", fieldId: invalid.id, reason: invalid.reason, label: invalid.label };
  }

  const { error } = await context.supabase.rpc("publish_form", { p_form_id: formId });
  if (error) return { ok: false, error: "publish_failed" };
  return { ok: true, base: JSON.stringify(schema) };
}

export async function unpublishForm(formId: string): Promise<{ ok: boolean }> {
  const context = await getLeader();
  if (!context || !isUuid(formId)) return { ok: false };
  const { error } = await context.supabase.from("forms").update({ status: "draft" }).eq("id", formId);
  return { ok: !error };
}

export async function renameForm(formId: string, title: string): Promise<{ ok: boolean; error?: string }> {
  const context = await getLeader();
  if (!context) return { ok: false, error: "unauthorized" };
  const clean = title.trim();
  if (!isUuid(formId) || !clean) return { ok: false, error: "title_required" };
  if (clean.length > 200) return { ok: false, error: "title_too_long" };
  const { error } = await context.supabase.from("forms").update({ title: clean }).eq("id", formId);
  return error ? { ok: false, error: "update_failed" } : { ok: true };
}

/** Only images uploaded to our own public media bucket are accepted as cover / logo. */
function ownMediaUrl(value: unknown): string | null | "invalid" {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/media/forms/`;
  return base.length > 60 && value.startsWith(base) && value.length < 500 ? value : "invalid";
}

export async function updateFormDesign(
  formId: string,
  input: { theme: unknown; coverUrl: string | null; logoUrl: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const context = await getLeader();
  if (!context) return { ok: false, error: "unauthorized" };
  if (!isUuid(formId)) return { ok: false, error: "update_failed" };
  const cover = ownMediaUrl(input.coverUrl);
  const logo = ownMediaUrl(input.logoUrl);
  if (cover === "invalid" || logo === "invalid") return { ok: false, error: "image_invalid" };
  const { error } = await context.supabase
    .from("forms")
    .update({ theme: parseTheme(input.theme), cover_url: cover, logo_url: logo })
    .eq("id", formId);
  return error ? { ok: false, error: "update_failed" } : { ok: true };
}

export async function updateFormSettings(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const id = readString(formData, "id");
  const locale = readString(formData, "locale") || "fr";
  const context = await getLeader();
  if (!context) redirect(`/${locale}/login`);
  if (!isUuid(id)) return { error: "update_failed" };

  const title = readString(formData, "title");
  const slug = readString(formData, "slug").toLowerCase();
  const status = readString(formData, "status");
  const redirectUrl = readString(formData, "redirectUrl");

  if (!title) return { error: "title_required" };
  if (title.length > 200) return { error: "title_too_long" };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    return { error: "slug_invalid" };
  }
  if (!["draft", "published", "archived"].includes(status)) {
    return { error: "update_failed" };
  }
  if (redirectUrl) {
    try {
      const url = new URL(redirectUrl);
      if (!/^https?:$/.test(url.protocol)) return { error: "redirect_invalid" };
    } catch {
      return { error: "redirect_invalid" };
    }
  }

  const { data: current } = await context.supabase
    .from("forms")
    .select("schema, status, published_version_id, settings")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { error: "update_failed" };
  if (status === "published" && !validateSchema(current.schema, true).ok) {
    return { error: "invalid_schema" };
  }

  const opensAt = parseDate(readString(formData, "opensAt"));
  const closesAt = parseDate(readString(formData, "closesAt"));
  if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
    return { error: "date_order" };
  }

  const knownIds = new Set(schemaFields(parseSchema(current.schema)).map((field) => field.id));
  const nameField = readString(formData, "respondentNameField");
  const emailField = readString(formData, "respondentEmailField");
  const maxRaw = readString(formData, "maxResponses");
  const maxResponses = maxRaw ? Number(maxRaw) : null;
  if (maxResponses !== null && (!Number.isInteger(maxResponses) || maxResponses < 1 || maxResponses > 1000000)) {
    return { error: "max_invalid" };
  }

  const settings: typeof DEFAULT_SETTINGS = {
    ...(DEFAULT_SETTINGS),
    ...((current.settings ?? {}) as Record<string, unknown>),
    submitLabel: readString(formData, "submitLabel").slice(0, 80),
    successTitle: readString(formData, "successTitle").slice(0, 200),
    successMessage: readString(formData, "successMessage").slice(0, 2000),
    redirectUrl,
    respondentNameField: knownIds.has(nameField) ? nameField : "",
    respondentEmailField: knownIds.has(emailField) ? emailField : "",
    maxResponses,
    onePerEmail: formData.get("onePerEmail") === "on",
    layout: readString(formData, "layout") === "question" ? "question" : "page",
  };

  const { error } = await context.supabase
    .from("forms")
    .update({
      title,
      slug,
      status,
      opens_at: opensAt,
      closes_at: closesAt,
      settings,
    })
    .eq("id", id);

  if (error) {
    return { error: error.code === "23505" ? "slug_taken" : "update_failed" };
  }
  // Going live from Settings also takes a snapshot, like the Publish button.
  if (status === "published" && (current.status !== "published" || !current.published_version_id)) {
    await context.supabase.rpc("publish_form", { p_form_id: id });
  }
  return { ok: true };
}

function failure(code: string, fieldId?: string): SubmitState {
  return { status: "error", code, fieldId };
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function validateText(field: FormField, value: string): SubmitState | null {
  switch (field.type) {
    case "multiple_choice":
    case "dropdown": {
      if (!(field.options ?? []).some((option) => option.id === value)) {
        return failure("invalid_choice", field.id);
      }
      return null;
    }
    case "number": {
      const number = Number(value);
      if (!Number.isFinite(number)) return failure("invalid_number", field.id);
      if (field.min != null && number < field.min) return failure("invalid_number", field.id);
      if (field.max != null && number > field.max) return failure("invalid_number", field.id);
      return null;
    }
    case "rating": {
      const number = Number(value);
      const max = field.max ?? 5;
      if (!Number.isInteger(number) || number < 1 || number > max) {
        return failure("invalid", field.id);
      }
      return null;
    }
    case "yes_no": {
      return value === "yes" || value === "no" ? null : failure("invalid", field.id);
    }
    case "nps": {
      const number = Number(value);
      return Number.isInteger(number) && number >= 0 && number <= 10 ? null : failure("invalid", field.id);
    }
    case "time": {
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? null : failure("invalid", field.id);
    }
    case "email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 320) {
        return failure("invalid_email", field.id);
      }
      return null;
    }
    case "phone": {
      if (!/^[+()\d\s.-]{6,30}$/.test(value)) return failure("invalid_phone", field.id);
      return null;
    }
    case "url": {
      try {
        const url = new URL(value);
        if (!/^https?:$/.test(url.protocol)) return failure("invalid_url", field.id);
      } catch {
        return failure("invalid_url", field.id);
      }
      return null;
    }
    case "date": {
      if (Number.isNaN(Date.parse(value))) return failure("invalid_date", field.id);
      return null;
    }
    default: {
      if (field.maxLength && value.length > field.maxLength) {
        return failure("too_long", field.id);
      }
      return null;
    }
  }
}

export async function submitForm(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const formId = readString(formData, "formId");
  if (!isUuid(formId)) return failure("submit_failed");

  const supabase = await createClient();
  const { data: form } = await supabase
    .from("forms")
    .select("id,title,status,schema,settings,opens_at,closes_at,sheet_id,published_version_id")
    .eq("id", formId)
    .maybeSingle();

  if (!form || form.status !== "published") return failure("closed");

  const now = Date.now();
  if (form.opens_at && new Date(form.opens_at).getTime() > now) return failure("closed");
  if (form.closes_at && new Date(form.closes_at).getTime() < now) return failure("closed");

  let schemaSource: unknown = form.schema;
  if (form.published_version_id) {
    const { data: version } = await supabase
      .from("form_versions")
      .select("schema")
      .eq("id", form.published_version_id)
      .maybeSingle();
    if (version) schemaSource = version.schema;
  }
  const schema = parseSchema(schemaSource);
  const fields = schemaFields(schema);
  const answers: Record<string, unknown> = {};

  for (const field of fields) {
    if (DISPLAY_TYPES.includes(field.type)) continue;

    if (field.type === "file") {
      const entry = formData.get(field.id);
      if (!(entry instanceof File) || entry.size === 0) {
        if (field.required) return failure("required", field.id);
        continue;
      }
      if (entry.size > 10 * 1024 * 1024) return failure("file_too_large", field.id);

      const safeName = entry.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-90) || "file";
      const path = `${form.id}/${uid("u")}-${safeName}`;
      const { error } = await supabase.storage.from("form-uploads").upload(path, entry, {
        contentType: entry.type || "application/octet-stream",
        upsert: false,
      });
      if (error) return failure("upload_failed", field.id);

      answers[field.id] = {
        path,
        name: entry.name.slice(0, 200),
        size: entry.size,
        type: entry.type,
      };
      continue;
    }

    if (field.type === "checkboxes") {
      const selected = formData
        .getAll(field.id)
        .filter((value): value is string => typeof value === "string" && value.length > 0);
      const valid = new Set((field.options ?? []).map((option) => option.id));
      if (selected.some((value) => !valid.has(value))) {
        return failure("invalid_choice", field.id);
      }
      if (selected.length === 0) {
        if (field.required) return failure("required", field.id);
        continue;
      }
      answers[field.id] = selected;
      continue;
    }

    if (field.type === "consent") {
      if (formData.get(field.id) === "on") {
        answers[field.id] = true;
        continue;
      }
      if (field.required) return failure("required", field.id);
      continue;
    }

    const value = normalizeText(formData.get(field.id));
    if (!value) {
      if (field.required) return failure("required", field.id);
      continue;
    }

    const invalid = validateText(field, value);
    if (invalid) return invalid;

    if (CHOICE_TYPES.includes(field.type)) {
      answers[field.id] = value;
    } else if (field.type === "number" || field.type === "rating" || field.type === "nps") {
      answers[field.id] = Number(value);
    } else {
      answers[field.id] = value.slice(0, field.maxLength ?? 5000);
    }
  }

  const mapped = parseSettings(form.settings);
  const emailField =
    fields.find((field) => field.id === mapped.respondentEmailField) ??
    fields.find((field) => field.type === "email");
  const nameField =
    fields.find((field) => field.id === mapped.respondentNameField) ??
    fields.find((field) => field.type === "short_text" && /(name|nom)/i.test(field.label));
  const respondentEmail =
    emailField && typeof answers[emailField.id] === "string"
      ? (answers[emailField.id] as string)
      : null;
  const respondentName =
    nameField && typeof answers[nameField.id] === "string"
      ? (answers[nameField.id] as string)
      : null;

  const requestHeaders = await headers();
  // The id is generated here: anonymous visitors may insert but not read responses back.
  const responseId = crypto.randomUUID();
  const { error } = await supabase
    .from("responses")
    .insert({
      id: responseId,
      form_id: form.id,
      answers,
      respondent_name: respondentName,
      respondent_email: respondentEmail,
      meta: {
        user_agent: requestHeaders.get("user-agent")?.slice(0, 300) ?? null,
        referer: requestHeaders.get("referer")?.slice(0, 300) ?? null,
      },
    });

  if (error) {
    if (error.message.includes("response_limit_reached")) return failure("limit_reached");
    if (error.message.includes("duplicate_response")) return failure("duplicate");
    return failure("submit_failed");
  }

  // The database queued the row; try now, and the cron retries if Google is down.
  if (form.sheet_id) await syncPending({ responseId }).catch(() => null);

  const settings = parseSettings(form.settings);
  if (settings.redirectUrl) redirect(settings.redirectUrl);
  return { status: "success" };
}

export async function runSheetSync(
  formId: string,
  mode: "retry" | "pending" | "rebuild",
): Promise<SyncResult> {
  const context = await getLeader();
  if (!context) return { ok: false, synced: 0, failed: 0, error: "unauthorized" };
  if (!isUuid(formId)) return { ok: false, synced: 0, failed: 0, error: "invalid" };
  // RLS: only forms this leader can see.
  const { data: form } = await context.supabase.from("forms").select("id").eq("id", formId).maybeSingle();
  if (!form) return { ok: false, synced: 0, failed: 0, error: "invalid" };
  if (mode === "rebuild") return rebuildSheet(formId);
  if (mode === "retry") return retryFailed(formId);
  return syncPending({ formId });
}

export async function disconnectSheet(formData: FormData) {
  const formId = readString(formData, "formId");
  const locale = readString(formData, "locale") || "fr";
  const context = await getLeader();
  if (!context) redirect(`/${locale}/login`);

  if (isUuid(formId)) {
    await context.supabase
      .from("forms")
      .update({ sheet_id: null, sheet_owner: null })
      .eq("id", formId);
  }
  redirect(`/${locale}/admin/forms/${formId}/integrations`);
}

export type { FieldType, FormActionState, SubmitState };
