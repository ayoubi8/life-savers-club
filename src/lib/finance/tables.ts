// Pure: turns ledger rows into plain tables (header + rows) for Google Sheets, Excel and CSV,
// so every copy of the numbers shows exactly the same thing.
import type { FinanceSheet, LedgerRow, YearTotals } from "./queries";

/** Translator for keys under adminFinance (next-intl `t`, or a stub in tests). */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export type Cell = string | number;
export type Table = { title: string; rows: Cell[][]; moneyColumns: number[] };

/** Google Sheets and Excel tab names: no []*?:/\ and at most 90 characters, unique. */
export function tabTitles(names: string[], reserved: string[] = []) {
  const used = new Set(reserved.map((name) => name.toLowerCase()));
  return names.map((name) => {
    const base = (name.replace(/[[\]*?:/\\]/g, "-").trim() || "Sheet").slice(0, 90);
    let title = base;
    for (let n = 2; used.has(title.toLowerCase()); n += 1) title = `${base.slice(0, 85)} (${n})`;
    used.add(title.toLowerCase());
    return title;
  });
}

const category = (t: Translate, kind: string, value: string) =>
  kind === "adjustment" ? t("kinds.adjustment") : t(`categories.${value}`);

/**
 * One row per product line (so quantities and unit prices stay usable in a spreadsheet).
 * The year balance appears on the last line of each operation.
 */
export function operationsTable(title: string, rows: LedgerRow[], people: Record<string, string>, t: Translate): Table {
  const header = [
    t("columns.date"),
    t("columns.type"),
    t("columns.operation"),
    t("columns.product"),
    t("columns.category"),
    t("columns.quantity"),
    t("columns.unitPrice"),
    t("columns.total"),
    t("columns.note"),
    t("columns.balanceAfter"),
    t("columns.by"),
    t("columns.status"),
  ];
  const body: Cell[][] = [];
  for (const row of rows) {
    const lines = row.lines.length ? row.lines : [{ product: row.label, quantity: 1, unit_price: row.amount, total: row.amount }];
    const status = row.cancelled_at ? t("export.cancelled", { reason: row.cancel_reason ?? "" }) : "";
    lines.forEach((line, index) => {
      const last = index === lines.length - 1;
      body.push([
        row.occurred_on,
        t(`kinds.${row.kind}`),
        row.label,
        line.product,
        category(t, row.kind, row.category),
        line.quantity,
        line.unit_price,
        line.total,
        row.note ?? "",
        last ? row.balance_after : "",
        row.created_by ? (people[row.created_by] ?? "") : "",
        status,
      ]);
    });
  }
  return { title, rows: [header, ...body], moneyColumns: [6, 7, 9] };
}

function byCategory(rows: LedgerRow[], t: Translate): Cell[][] {
  const totals = new Map<string, { kind: string; amount: number }>();
  for (const row of rows) {
    if (row.cancelled_at || row.kind === "adjustment") continue;
    const key = `${row.kind}:${row.category}`;
    totals.set(key, { kind: row.kind, amount: (totals.get(key)?.amount ?? 0) + row.amount });
  }
  return [...totals.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([key, value]) => [t(`kinds.${value.kind}`), category(t, value.kind, key.split(":")[1]), value.amount]);
}

/** Summary of one sheet: received, spent, net, then totals by category. */
export function sheetSummaryTable(title: string, sheet: Pick<FinanceSheet, "name" | "received" | "spent">, rows: LedgerRow[], t: Translate): Table {
  return {
    title,
    rows: [
      [sheet.name, ""],
      [t("totals.received"), sheet.received],
      [t("totals.spent"), sheet.spent],
      [t("totals.net"), sheet.received - sheet.spent],
      [],
      [t("columns.type"), t("columns.category"), t("columns.total")],
      ...byCategory(rows, t),
    ],
    moneyColumns: [1, 2],
  };
}

/** Summary of the year: opening, received, spent, adjustments, balance, then each sheet and each category. */
export function yearSummaryTable(
  title: string,
  label: string,
  totals: YearTotals,
  sheets: Pick<FinanceSheet, "name" | "received" | "spent">[],
  rows: LedgerRow[],
  t: Translate,
): Table {
  return {
    title,
    rows: [
      [label, ""],
      [t("totals.opening"), totals.opening_balance],
      [t("totals.received"), totals.received],
      [t("totals.spent"), totals.spent],
      [t("totals.adjustments"), totals.adjustments],
      [t("totals.balance"), totals.balance],
      [],
      [t("export.sheet"), t("totals.received"), t("totals.spent"), t("totals.net")],
      ...sheets.map((sheet) => [sheet.name, sheet.received, sheet.spent, sheet.received - sheet.spent]),
      [],
      [t("columns.type"), t("columns.category"), t("columns.total")],
      ...byCategory(rows, t),
    ],
    moneyColumns: [1, 2, 3],
  };
}

/** Admin corrections outside sheets. */
export function adjustmentsTable(title: string, rows: LedgerRow[], people: Record<string, string>, t: Translate): Table {
  return {
    title,
    rows: [
      [t("columns.date"), t("columns.reason"), t("columns.total"), t("columns.balanceAfter"), t("columns.by"), t("columns.status")],
      ...rows
        .filter((row) => row.kind === "adjustment")
        .map((row) => [
          row.occurred_on,
          row.label,
          row.amount,
          row.balance_after,
          row.created_by ? (people[row.created_by] ?? "") : "",
          row.cancelled_at ? t("export.cancelled", { reason: row.cancel_reason ?? "" }) : "",
        ]),
    ],
    moneyColumns: [2, 3],
  };
}

/** CSV with a BOM so Excel opens accents correctly. */
export function toCsv(table: Table) {
  const cell = (value: Cell) => {
    const text = String(value ?? "");
    // Formula injection guard for spreadsheet apps.
    const safe = /^[=+\-@\t\r]/.test(text) && typeof value === "string" ? `'${text}` : text;
    return /[",\r\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return `﻿${table.rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;
}
