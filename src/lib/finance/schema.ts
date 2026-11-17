// Pure helpers for the finance space (no server imports): safe in server code, client components and tests.
import { z } from "zod";

export const KINDS = ["expense", "income", "adjustment"] as const;
export type FinanceKind = (typeof KINDS)[number];

export const EXPENSE_CATEGORIES = ["supplies", "equipment", "food", "transport", "printing", "venue", "gifts", "fees", "other"] as const;
export const INCOME_CATEGORIES = ["sponsor", "training", "membership_fees", "donation", "tickets", "other"] as const;
export const PAYMENT_METHODS = ["cash", "transfer", "card", "cheque", "other"] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_LINES = 50;

export function categoriesFor(kind: FinanceKind): readonly string[] {
  return kind === "income" ? INCOME_CATEGORIES : kind === "expense" ? EXPENSE_CATEGORIES : ["adjustment"];
}

// ───────── Money (DZD) ─────────

/**
 * Reads what people type: "12500", "12 500", "12 500,50", "12.500,50", "12,500.50", "1500.5".
 * Returns null when it is not a number. Rounded to centimes.
 */
export function parseAmount(input: string | number | null | undefined, decimals = 2): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? round(input, decimals) : null;
  if (input == null) return null;
  let text = String(input).replace(/[\s  ]/g, "").replace(/(DA|DZD|دج)$/i, "");
  if (!text) return null;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: the last one is the decimal separator, the other groups thousands.
    const decimal = lastComma > lastDot ? "," : ".";
    text = text.split(decimal === "," ? "." : ",").join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    // "12,500" (thousands) vs "12,5" (decimal): three digits after a single comma = thousands.
    const parts = text.split(",");
    text = parts.length === 2 && parts[1].length !== 3 ? parts.join(".") : parts.join("");
  } else if (lastDot >= 0) {
    const parts = text.split(".");
    text = parts.length > 2 ? parts.join("") : text;
  }
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return round(Number(text), decimals);
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Same rule as the database: round(quantity × unit price, 2). */
export function lineTotal(quantity: number, unitPrice: number) {
  return round(quantity * unitPrice, 2);
}

/** "12 500 DA", "12 500,50 DA" (centimes only when there are some). */
export function formatDzd(amount: number, locale = "fr", options: { sign?: boolean } = {}) {
  const hasCents = Math.round(Math.abs(amount) * 100) % 100 !== 0;
  const text = new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
    signDisplay: options.sign ? "exceptZero" : "auto",
  }).format(amount);
  return `${text} DA`;
}

export function formatQuantity(quantity: number, locale = "fr") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 3 }).format(quantity);
}

// ───────── The 24-hour rule (the database enforces it; this drives the screen) ─────────

export function editableUntil(createdAt: string) {
  return new Date(Date.parse(createdAt) + EDIT_WINDOW_MS);
}

export function canEditOperation(
  operation: { kind: FinanceKind; created_by: string | null; created_at: string; cancelled_at: string | null },
  viewer: { id: string; admin: boolean },
  yearOpen: boolean,
  now = Date.now(),
) {
  if (!yearOpen) return false;
  if (viewer.admin) return true;
  return (
    operation.kind !== "adjustment" &&
    !operation.cancelled_at &&
    operation.created_by === viewer.id &&
    editableUntil(operation.created_at).getTime() > now
  );
}

/** "21 h", "35 min": time left to edit, or null when locked. */
export function timeLeft(createdAt: string, now = Date.now()) {
  const ms = editableUntil(createdAt).getTime() - now;
  if (ms <= 0) return null;
  const minutes = Math.ceil(ms / 60_000);
  return minutes >= 60 ? { hours: Math.floor(minutes / 60), minutes: 0 } : { hours: 0, minutes };
}

// ───────── Inputs ─────────

const money = z.number().min(0).max(1_000_000_000);
const quantity = z.number().gt(0).max(1_000_000);

export const lineSchema = z.object({
  product: z.string().trim().min(1).max(200),
  quantity,
  unit_price: money,
});

export const operationSchema = z
  .object({
    id: z.uuid().optional(),
    sheet_id: z.uuid(),
    kind: z.enum(["expense", "income"]),
    occurred_on: z.iso.date(),
    category: z.string().min(1).max(40),
    label: z.string().trim().min(1).max(200),
    counterparty: z.string().trim().max(200).optional().default(""),
    payment_method: z.enum(PAYMENT_METHODS).nullable().optional(),
    note: z.string().trim().max(2000).optional().default(""),
    receipt_path: z.string().max(300).nullable().optional(),
    expected_updated_at: z.string().optional(),
    lines: z.array(lineSchema).min(1).max(MAX_LINES),
  })
  .refine((value) => categoriesFor(value.kind).includes(value.category), { message: "invalid_category", path: ["category"] })
  .refine((value) => value.kind !== "income" || value.lines.length === 1, { message: "invalid_lines", path: ["lines"] });

export type OperationInput = z.input<typeof operationSchema>;

export const sheetNameSchema = z.string().trim().min(1).max(120);
export const yearLabelSchema = z.string().trim().min(1).max(40);
export const reasonSchema = z.string().trim().min(3).max(500);

/** Receipts live at "<sheetId>/<uuid>.<ext>" in the finance-receipts bucket. */
export function isReceiptPath(path: string, sheetId: string) {
  return new RegExp(`^${sheetId}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp|pdf)$`, "i").test(path);
}

export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
