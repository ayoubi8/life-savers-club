// Server only. Pages pass the user's Supabase client (RLS: can_access('finance') applies);
// the Google Sheets worker passes the service-role client.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinanceKind } from "./schema";

type ServerClient = SupabaseClient;

export type FinanceYear = {
  id: string;
  label: string;
  opening_balance: number;
  status: "open" | "closed";
  starts_on: string;
  ends_on: string | null;
  gsheet_id: string | null;
  created_at: string;
};

export type YearTotals = { opening_balance: number; received: number; spent: number; adjustments: number; balance: number };

export type FinanceSheet = {
  id: string;
  year_id: string;
  name: string;
  description: string | null;
  event_id: string | null;
  gsheet_id: string | null;
  created_by: string | null;
  created_at: string;
  archived_at: string | null;
  locked_at: string | null;
  received: number;
  spent: number;
  operations: number;
  last_change: string | null;
};

export type FinanceLine = { id: string; product: string; quantity: number; unit_price: number; total: number; position: number };

export type LedgerRow = {
  id: string;
  year_id: string;
  sheet_id: string | null;
  kind: FinanceKind;
  occurred_on: string;
  category: string;
  label: string;
  counterparty: string | null;
  payment_method: string | null;
  note: string | null;
  receipt_path: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  amount: number;
  signed_amount: number;
  balance_after: number;
  lines: FinanceLine[];
};

const num = (value: unknown) => (value == null ? 0 : Number(value));

const LEDGER_COLUMNS =
  "id, year_id, sheet_id, kind, occurred_on, category, label, counterparty, payment_method, note, receipt_path, cancelled_at, cancel_reason, created_by, created_at, updated_at, amount, signed_amount, balance_after";

export async function listYears(supabase: ServerClient): Promise<FinanceYear[]> {
  const { data } = await supabase
    .from("finance_years")
    .select("id, label, opening_balance, status, starts_on, ends_on, gsheet_id, created_at")
    .order("starts_on", { ascending: false });
  return ((data ?? []) as FinanceYear[]).map((year) => ({ ...year, opening_balance: num(year.opening_balance) }));
}

/** The year to show: the one asked for, else the open one, else the latest. */
export function pickYear(years: FinanceYear[], wanted?: string | null) {
  return years.find((year) => year.id === wanted) ?? years.find((year) => year.status === "open") ?? years[0] ?? null;
}

export async function getYearTotals(supabase: ServerClient, yearId: string): Promise<YearTotals> {
  const { data } = await supabase.from("finance_year_totals").select("*").eq("year_id", yearId).maybeSingle();
  return {
    opening_balance: num(data?.opening_balance),
    received: num(data?.received),
    spent: num(data?.spent),
    adjustments: num(data?.adjustments),
    balance: num(data?.balance),
  };
}

export async function listSheets(supabase: ServerClient, yearId: string, archived = false): Promise<FinanceSheet[]> {
  let query = supabase
    .from("finance_sheets")
    .select("id, year_id, name, description, event_id, gsheet_id, created_by, created_at, archived_at, locked_at")
    .eq("year_id", yearId)
    .order("created_at", { ascending: false });
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data: sheets } = await query;
  const list = (sheets ?? []) as Omit<FinanceSheet, "received" | "spent" | "operations" | "last_change">[];
  if (!list.length) return [];
  const { data: totals } = await supabase
    .from("finance_sheet_totals")
    .select("sheet_id, received, spent, operations, last_change")
    .in("sheet_id", list.map((sheet) => sheet.id));
  const byId = new Map((totals ?? []).map((row) => [row.sheet_id as string, row]));
  return list.map((sheet) => {
    const total = byId.get(sheet.id);
    return {
      ...sheet,
      received: num(total?.received),
      spent: num(total?.spent),
      operations: num(total?.operations),
      last_change: (total?.last_change as string | null) ?? null,
    };
  });
}

export async function getSheet(supabase: ServerClient, sheetId: string) {
  const [{ data: sheet }, { data: totals }] = await Promise.all([
    supabase
      .from("finance_sheets")
      .select("id, year_id, name, description, event_id, gsheet_id, created_by, created_at, archived_at, locked_at")
      .eq("id", sheetId)
      .maybeSingle(),
    supabase.from("finance_sheet_totals").select("received, spent, operations, last_change").eq("sheet_id", sheetId).maybeSingle(),
  ]);
  if (!sheet) return null;
  return {
    ...(sheet as Omit<FinanceSheet, "received" | "spent" | "operations" | "last_change">),
    received: num(totals?.received),
    spent: num(totals?.spent),
    operations: num(totals?.operations),
    last_change: (totals?.last_change as string | null) ?? null,
  } satisfies FinanceSheet;
}

function toRow(row: Record<string, unknown>, lines: FinanceLine[]): LedgerRow {
  return {
    ...(row as unknown as LedgerRow),
    amount: num(row.amount),
    signed_amount: num(row.signed_amount),
    balance_after: num(row.balance_after),
    lines,
  };
}

async function withLines(supabase: ServerClient, rows: Record<string, unknown>[]) {
  const ids = rows.map((row) => row.id as string);
  const lines = new Map<string, FinanceLine[]>();
  for (let start = 0; start < ids.length; start += 200) {
    const { data } = await supabase
      .from("finance_lines")
      .select("id, operation_id, product, quantity, unit_price, total, position")
      .in("operation_id", ids.slice(start, start + 200))
      .order("position");
    for (const line of data ?? []) {
      const list = lines.get(line.operation_id as string) ?? [];
      list.push({
        id: line.id as string,
        product: line.product as string,
        quantity: num(line.quantity),
        unit_price: num(line.unit_price),
        total: num(line.total),
        position: num(line.position),
      });
      lines.set(line.operation_id as string, list);
    }
  }
  return rows.map((row) => toRow(row, lines.get(row.id as string) ?? []));
}

/** A sheet's operations in sheet order (oldest first), with lines and the year balance after each. */
export async function listSheetOperations(supabase: ServerClient, sheetId: string) {
  const { data } = await supabase
    .from("finance_ledger")
    .select(LEDGER_COLUMNS)
    .eq("sheet_id", sheetId)
    .order("occurred_on")
    .order("created_at")
    .order("id")
    .limit(3000);
  return withLines(supabase, (data ?? []) as Record<string, unknown>[]);
}

/** Every operation of the year (oldest first), for the chart, totals and exports. */
export async function listYearOperations(supabase: ServerClient, yearId: string, withProductLines = false) {
  const { data } = await supabase
    .from("finance_ledger")
    .select(LEDGER_COLUMNS)
    .eq("year_id", yearId)
    .order("occurred_on")
    .order("created_at")
    .order("id")
    .limit(10000);
  const rows = (data ?? []) as Record<string, unknown>[];
  return withProductLines ? withLines(supabase, rows) : rows.map((row) => toRow(row, []));
}

/**
 * Display names of authors. Members cannot read other profiles, so the user client goes through
 * the finance_people function; the service role (no signed-in user) reads profiles directly.
 */
export async function getPeople(supabase: ServerClient, ids: (string | null)[], serviceRole = false) {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  if (!wanted.length) return {} as Record<string, string>;
  if (serviceRole) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", wanted);
    return Object.fromEntries(
      ((data ?? []) as { id: string; full_name: string | null; email: string }[]).map((p) => [p.id, p.full_name?.trim() || p.email.split("@")[0]]),
    );
  }
  const { data } = await supabase.rpc("finance_people", { p_ids: wanted });
  return Object.fromEntries(((data ?? []) as { id: string; name: string }[]).map((person) => [person.id, person.name]));
}

/** Balance after each operation (one point per day, last value of the day) for the chart. */
export function balanceSeries(rows: LedgerRow[], opening: number, startsOn: string) {
  const points = new Map<string, number>([[startsOn, opening]]);
  for (const row of rows) points.set(row.occurred_on, row.balance_after);
  return [...points.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, balance]) => ({ date, balance }));
}

/** Totals by category for one kind, biggest first. */
export function categoryTotals(rows: LedgerRow[], kind: "income" | "expense") {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.kind !== kind || row.cancelled_at) continue;
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.amount);
  }
  return [...totals.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export type AuditEntry = {
  id: number;
  table_name: string;
  row_id: string;
  operation_id: string | null;
  action: "insert" | "update" | "delete";
  old_row: Record<string, unknown> | null;
  new_row: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
};

export async function listAudit(supabase: ServerClient, limit = 300): Promise<AuditEntry[]> {
  const { data } = await supabase.from("finance_audit").select("*").order("changed_at", { ascending: false }).limit(limit);
  return (data ?? []) as AuditEntry[];
}
