"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireSection } from "@/lib/auth";
import { processFinanceSync } from "./gsheets";
import { isReceiptPath, operationSchema, parseAmount, reasonSchema, sheetNameSchema, yearLabelSchema, type OperationInput } from "./schema";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const uuid = z.uuid();

/** Pages are dynamic; this drops the client router cache, then refreshes Google copies in the background. */
function changed() {
  for (const locale of ["fr", "en"]) revalidatePath(`/${locale}/admin/finance`, "layout");
  after(() => processFinanceSync(5).catch(() => undefined));
}

/** Database errors raised by the finance rules, as keys the UI translates. */
function dbError(error: { message?: string; code?: string } | null): string {
  if (!error) return "failed";
  const known = ["sheet_locked", "locked", "stale", "invalid_lines", "invalid_sheet", "immutable_field", "reason_required", "forbidden", "not_found", "invalid"];
  if (error.message && known.includes(error.message)) return error.message;
  if (error.code === "23505") return "name_taken";
  if (error.code === "42501") return "locked"; // RLS: closed year or no right
  if (error.code === "23514" || error.code === "22P02") return "invalid";
  return "failed";
}

const finance = () => requireSection("finance");
const admin = () => requireSection("accounts");

// ───────── Years (admins) ─────────

export async function openYear(input: { label: string; openingBalance: string; startsOn: string }): Promise<Result<{ id: string }>> {
  const ctx = await admin();
  if (!ctx) return { ok: false, error: "forbidden" };
  const label = yearLabelSchema.safeParse(input.label);
  const opening = parseAmount(input.openingBalance);
  const startsOn = z.iso.date().safeParse(input.startsOn);
  if (!label.success || opening === null || !startsOn.success) return { ok: false, error: "invalid" };
  const { data, error } = await ctx.supabase
    .from("finance_years")
    .insert({ label: label.data, opening_balance: opening, starts_on: startsOn.data })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.code === "23505" ? "year_exists" : dbError(error) };
  changed();
  return { ok: true, id: data.id as string };
}

export async function setYearStatus(yearId: string, status: "open" | "closed"): Promise<Result> {
  const ctx = await admin();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!uuid.safeParse(yearId).success || !["open", "closed"].includes(status)) return { ok: false, error: "invalid" };
  const { error } = await ctx.supabase
    .from("finance_years")
    .update({ status, ends_on: status === "closed" ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", yearId);
  if (error) return { ok: false, error: error.code === "23505" ? "year_already_open" : dbError(error) };
  changed();
  return { ok: true };
}

export async function setOpeningBalance(yearId: string, amount: string): Promise<Result> {
  const ctx = await admin();
  if (!ctx) return { ok: false, error: "forbidden" };
  const value = parseAmount(amount);
  if (!uuid.safeParse(yearId).success || value === null) return { ok: false, error: "invalid" };
  const { error } = await ctx.supabase.from("finance_years").update({ opening_balance: value }).eq("id", yearId).eq("status", "open");
  if (error) return { ok: false, error: dbError(error) };
  changed();
  return { ok: true };
}

export async function adjustBalance(input: { yearId: string; amount: string; reason: string; date: string }): Promise<Result> {
  const ctx = await admin();
  if (!ctx) return { ok: false, error: "forbidden" };
  const amount = parseAmount(input.amount);
  const reason = reasonSchema.safeParse(input.reason);
  const date = z.iso.date().safeParse(input.date);
  if (!uuid.safeParse(input.yearId).success || amount === null || amount === 0 || !reason.success || !date.success) {
    return { ok: false, error: "invalid" };
  }
  const { error } = await ctx.supabase.rpc("finance_adjust_balance", {
    p_year: input.yearId,
    p_amount: amount,
    p_reason: reason.data,
    p_on: date.data,
  });
  if (error) return { ok: false, error: dbError(error) };
  changed();
  return { ok: true };
}

// ───────── Sheets ─────────

export async function createSheet(input: { yearId: string; name: string; description?: string }): Promise<Result<{ id: string }>> {
  const ctx = await finance();
  if (!ctx) return { ok: false, error: "forbidden" };
  const name = sheetNameSchema.safeParse(input.name);
  if (!uuid.safeParse(input.yearId).success || !name.success) return { ok: false, error: "invalid_name" };
  const { data, error } = await ctx.supabase
    .from("finance_sheets")
    .insert({ year_id: input.yearId, name: name.data, description: input.description?.trim().slice(0, 1000) || null })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: dbError(error) };
  changed();
  return { ok: true, id: data.id as string };
}

export async function updateSheet(sheetId: string, input: { name: string; description?: string }): Promise<Result> {
  const ctx = await finance();
  if (!ctx) return { ok: false, error: "forbidden" };
  const name = sheetNameSchema.safeParse(input.name);
  if (!uuid.safeParse(sheetId).success || !name.success) return { ok: false, error: "invalid_name" };
  const { data, error } = await ctx.supabase
    .from("finance_sheets")
    .update({ name: name.data, description: input.description?.trim().slice(0, 1000) || null })
    .eq("id", sheetId)
    .select("id");
  if (error) return { ok: false, error: dbError(error) };
  if (!data?.length) return { ok: false, error: "forbidden" }; // not the author (RLS)
  changed();
  return { ok: true };
}

/** Admins only: a locked sheet is read-only for everyone until it is unlocked. */
export async function setSheetLocked(sheetId: string, locked: boolean): Promise<Result> {
  const ctx = await admin();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!uuid.safeParse(sheetId).success) return { ok: false, error: "invalid" };
  const { data, error } = await ctx.supabase
    .from("finance_sheets")
    .update({ locked_at: locked ? new Date().toISOString() : null })
    .eq("id", sheetId)
    .select("id");
  if (error) return { ok: false, error: dbError(error) };
  if (!data?.length) return { ok: false, error: "forbidden" };
  changed();
  return { ok: true };
}

export async function setSheetArchived(sheetId: string, archived: boolean): Promise<Result> {
  const ctx = await finance();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!uuid.safeParse(sheetId).success) return { ok: false, error: "invalid" };
  const { data, error } = await ctx.supabase
    .from("finance_sheets")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", sheetId)
    .select("id");
  if (error) return { ok: false, error: dbError(error) };
  if (!data?.length) return { ok: false, error: "forbidden" };
  changed();
  return { ok: true };
}

// ───────── Operations ─────────

/** Adds or edits a purchase / income with its product lines. The 24-hour rule is enforced by the database. */
export async function saveOperation(input: OperationInput): Promise<Result<{ id: string }>> {
  const ctx = await finance();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = operationSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    return { ok: false, error: issue === "invalid_category" || issue === "invalid_lines" ? issue : "invalid" };
  }
  const value = parsed.data;
  if (value.receipt_path && !isReceiptPath(value.receipt_path, value.sheet_id)) return { ok: false, error: "invalid" };

  const { data, error } = await ctx.supabase.rpc("finance_save_operation", {
    p: {
      ...value,
      payment_method: value.payment_method ?? null,
      receipt_path: value.receipt_path ?? null,
      lines: value.lines.map((line) => ({ product: line.product, quantity: line.quantity, unit_price: line.unit_price })),
    },
  });
  if (error || !data) return { ok: false, error: dbError(error) };
  changed();
  return { ok: true, id: data as string };
}

export async function cancelOperation(operationId: string, reason: string): Promise<Result> {
  const ctx = await finance();
  if (!ctx) return { ok: false, error: "forbidden" };
  const text = reasonSchema.safeParse(reason);
  if (!uuid.safeParse(operationId).success) return { ok: false, error: "invalid" };
  if (!text.success) return { ok: false, error: "reason_required" };
  const { error } = await ctx.supabase.rpc("finance_cancel_operation", { p_id: operationId, p_reason: text.data });
  if (error) return { ok: false, error: dbError(error) };
  changed();
  return { ok: true };
}

/** Admins only: bring a cancelled operation back. */
export async function restoreOperation(operationId: string): Promise<Result> {
  const ctx = await admin();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!uuid.safeParse(operationId).success) return { ok: false, error: "invalid" };
  const { data, error } = await ctx.supabase
    .from("finance_operations")
    .update({ cancelled_at: null, cancelled_by: null, cancel_reason: null })
    .eq("id", operationId)
    .select("id");
  if (error) return { ok: false, error: dbError(error) };
  if (!data?.length) return { ok: false, error: "locked" };
  changed();
  return { ok: true };
}

// ───────── Google Sheets ─────────

/** The Gmail used to open finance files in Google Sheets (empty = the account email). */
export async function setShareEmail(email: string): Promise<Result> {
  const ctx = await finance();
  if (!ctx) return { ok: false, error: "forbidden" };
  const value = email.trim().toLowerCase();
  if (value && !z.email().safeParse(value).success) return { ok: false, error: "invalid_email" };
  const { error } = await ctx.supabase.from("profiles").update({ google_share_email: value || null }).eq("id", ctx.profile.id);
  if (error) return { ok: false, error: dbError(error) };
  for (const locale of ["fr", "en"]) revalidatePath(`/${locale}/admin/finance`, "layout");
  return { ok: true };
}
