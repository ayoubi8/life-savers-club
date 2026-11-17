import { describe, expect, it } from "vitest";
import type { LedgerRow } from "./queries";
import { operationsTable, tabTitles, toCsv, yearSummaryTable } from "./tables";

const t = (key: string, values?: Record<string, string | number>) => (values ? `${key}(${Object.values(values).join(",")})` : key);

const row = (over: Partial<LedgerRow>): LedgerRow => ({
  id: "op",
  year_id: "y",
  sheet_id: "s",
  kind: "expense",
  occurred_on: "2026-11-14",
  category: "supplies",
  label: "Pharmacie",
  counterparty: "Pharmacie Y",
  payment_method: "cash",
  note: null,
  receipt_path: null,
  cancelled_at: null,
  cancel_reason: null,
  created_by: "u1",
  created_at: "2026-11-14T10:00:00Z",
  updated_at: "2026-11-14T10:00:00Z",
  amount: 2000,
  signed_amount: -2000,
  balance_after: 98000,
  lines: [
    { id: "l1", product: "Bandages", quantity: 10, unit_price: 150, total: 1500, position: 0 },
    { id: "l2", product: "Gloves", quantity: 2, unit_price: 250, total: 500, position: 1 },
  ],
  ...over,
});

describe("operationsTable", () => {
  it("writes one row per product and the balance on the last line", () => {
    const table = operationsTable("Gala", [row({})], { u1: "Amine" }, t);
    expect(table.rows).toHaveLength(3);
    expect(table.rows[1].slice(3, 8)).toEqual(["Bandages", "categories.supplies", 10, 150, 1500]);
    expect(table.rows[1][11]).toBe("");
    expect(table.rows[2][11]).toBe(98000);
    expect(table.rows[2][12]).toBe("Amine");
  });

  it("marks cancelled operations with their reason", () => {
    const table = operationsTable("Gala", [row({ cancelled_at: "2026-11-15T00:00:00Z", cancel_reason: "duplicate" })], {}, t);
    expect(table.rows[1][13]).toBe("export.cancelled(duplicate)");
  });
});

describe("yearSummaryTable", () => {
  it("lists totals, sheets and categories, without cancelled rows", () => {
    const rows = [row({}), row({ id: "x", kind: "income", category: "sponsor", amount: 50000, lines: [] }), row({ id: "c", cancelled_at: "now", amount: 999 })];
    const table = yearSummaryTable("Summary", "2026-2027", { opening_balance: 100000, received: 50000, spent: 2000, adjustments: 0, balance: 148000 }, [{ name: "Gala", received: 50000, spent: 2000 }], rows, t);
    expect(table.rows[5]).toEqual(["totals.balance", 148000]);
    expect(table.rows[8]).toEqual(["Gala", 50000, 2000, 48000]);
    const categories = table.rows.slice(11);
    expect(categories).toEqual([
      ["kinds.income", "categories.sponsor", 50000],
      ["kinds.expense", "categories.supplies", 2000],
    ]);
  });
});

describe("tabTitles", () => {
  it("removes forbidden characters and keeps titles unique", () => {
    expect(tabTitles(["Gala 2026", "gala 2026", "A/B: test?"], ["Summary"])).toEqual(["Gala 2026", "gala 2026 (2)", "A-B- test-"]);
    expect(tabTitles(["Summary"], ["Summary"])).toEqual(["Summary (2)"]);
  });
});

describe("toCsv", () => {
  it("quotes, keeps accents and blocks formulas", () => {
    const csv = toCsv({ title: "x", rows: [["Libellé", "=HYPERLINK(1)", 'a"b', 12.5]], moneyColumns: [] });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Libellé,'=HYPERLINK(1),\"a\"\"b\",12.5");
  });
});
