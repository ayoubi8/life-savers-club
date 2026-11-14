import type { SupabaseClient } from "@supabase/supabase-js";
import {
  answerToText,
  DISPLAY_TYPES,
  schemaFields,
  type FormField,
  type FormSchema,
} from "./schema";

export const PAGE_SIZE = 25;
/** Search and summaries scan at most this many (newest) responses. */
export const SCAN_CAP = 5000;

export const RESPONSE_STATUSES = ["new", "reviewed", "accepted", "rejected", "spam"] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export type ResponseRow = {
  id: string;
  answers: Record<string, unknown>;
  respondent_name: string | null;
  respondent_email: string | null;
  created_at: string;
  synced_to_sheet: boolean;
  status: ResponseStatus;
  review_note: string | null;
};

export type ResultsFilters = {
  view: "table" | "summary";
  q: string;
  status: ResponseStatus | "";
  from: string;
  to: string;
  page: number;
};

const COLUMNS =
  "id, answers, respondent_name, respondent_email, created_at, synced_to_sheet, status, review_note";

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

export function parseFilters(sp: Record<string, string | string[] | undefined>): ResultsFilters {
  const one = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const status = one("status");
  const page = Number(one("page"));
  return {
    view: one("view") === "summary" ? "summary" : "table",
    q: one("q").trim().slice(0, 100),
    status: (RESPONSE_STATUSES as readonly string[]).includes(status) ? (status as ResponseStatus) : "",
    from: dateOnly.test(one("from")) ? one("from") : "",
    to: dateOnly.test(one("to")) ? one("to") : "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Same filters, as a query string (for links and exports). */
export function filtersToParams(filters: Partial<ResultsFilters>) {
  const params = new URLSearchParams();
  if (filters.view === "summary") params.set("view", "summary");
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export function searchableText(row: ResponseRow, fields: FormField[]) {
  const answers = fields
    .filter((field) => !DISPLAY_TYPES.includes(field.type))
    .map((field) => answerToText(row.answers[field.id], field));
  return [row.respondent_name ?? "", row.respondent_email ?? "", ...answers].join(" \n ").toLowerCase();
}

type Fetched = { rows: ResponseRow[]; total: number; truncated: boolean };

/**
 * Returns one page of responses, or (mode "all") everything up to SCAN_CAP.
 * Filters by status/date happen in the database. Free-text search scans the newest
 * SCAN_CAP matching responses, because answers are stored as JSON.
 */
export async function fetchResponses(
  supabase: SupabaseClient,
  formId: string,
  schema: FormSchema,
  filters: ResultsFilters,
  mode: "page" | "all",
): Promise<Fetched> {
  const build = (withCount: boolean) => {
    let query = supabase
      .from("responses")
      .select(COLUMNS, withCount ? { count: "exact" } : undefined)
      .eq("form_id", formId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00`);
    if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999`);
    return query;
  };

  // Fast path: no text search, so the database can count and paginate.
  if (!filters.q && mode === "page") {
    const from = (filters.page - 1) * PAGE_SIZE;
    const { data, count } = await build(true)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    return { rows: (data ?? []) as unknown as ResponseRow[], total: count ?? 0, truncated: false };
  }

  const { data } = await build(false)
    .order("created_at", { ascending: false })
    .limit(SCAN_CAP);
  let rows = (data ?? []) as unknown as ResponseRow[];
  const truncated = rows.length >= SCAN_CAP;

  if (filters.q) {
    const needle = filters.q.toLowerCase();
    const fields = schemaFields(schema);
    rows = rows.filter((row) => searchableText(row, fields).includes(needle));
  }

  const total = rows.length;
  if (mode === "page") {
    const from = (filters.page - 1) * PAGE_SIZE;
    rows = rows.slice(from, from + PAGE_SIZE);
  }
  return { rows, total, truncated };
}

// ───────── per-question summaries ─────────

export type QuestionSummary = {
  id: string;
  label: string;
  type: FormField["type"];
  answered: number;
  bars?: { label: string; count: number }[];
  average?: number;
  nps?: number;
  min?: number;
  max?: number;
  latest?: string[];
};

export function summarize(schema: FormSchema, rows: ResponseRow[]): QuestionSummary[] {
  const result: QuestionSummary[] = [];

  for (const field of schemaFields(schema)) {
    if (DISPLAY_TYPES.includes(field.type)) continue;
    const values = rows
      .map((row) => row.answers[field.id])
      .filter((value) => value != null && value !== "" && !(Array.isArray(value) && value.length === 0));
    const base: QuestionSummary = { id: field.id, label: field.label, type: field.type, answered: values.length };

    switch (field.type) {
      case "multiple_choice":
      case "dropdown":
      case "checkboxes": {
        const counts = new Map((field.options ?? []).map((option) => [option.id, 0]));
        for (const value of values) {
          for (const id of Array.isArray(value) ? value : [value]) {
            if (typeof id === "string" && counts.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
          }
        }
        base.bars = (field.options ?? []).map((option) => ({ label: option.label, count: counts.get(option.id) ?? 0 }));
        break;
      }
      case "yes_no": {
        base.bars = ["yes", "no"].map((key) => ({
          label: key,
          count: values.filter((value) => value === key).length,
        }));
        break;
      }
      case "consent": {
        base.bars = [{ label: "yes", count: values.filter((value) => value === true).length }];
        break;
      }
      case "rating":
      case "nps": {
        const numbers = values.map(Number).filter((n) => Number.isFinite(n));
        const low = field.type === "nps" ? 0 : 1;
        const high = field.type === "nps" ? 10 : field.max ?? 5;
        base.bars = Array.from({ length: high - low + 1 }, (_, index) => ({
          label: String(low + index),
          count: numbers.filter((n) => n === low + index).length,
        }));
        if (numbers.length) base.average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        if (field.type === "nps" && numbers.length) {
          const promoters = numbers.filter((n) => n >= 9).length;
          const detractors = numbers.filter((n) => n <= 6).length;
          base.nps = Math.round(((promoters - detractors) / numbers.length) * 100);
        }
        break;
      }
      case "number": {
        const numbers = values.map(Number).filter((n) => Number.isFinite(n));
        if (numbers.length) {
          base.average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          base.min = Math.min(...numbers);
          base.max = Math.max(...numbers);
        }
        break;
      }
      case "file":
        break;
      default:
        base.latest = values.slice(0, 5).map((value) => answerToText(value, field)).filter(Boolean);
    }
    result.push(base);
  }
  return result;
}
