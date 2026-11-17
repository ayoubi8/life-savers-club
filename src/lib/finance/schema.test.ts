import { describe, expect, it } from "vitest";
import { canEditOperation, formatDzd, isReceiptPath, lineTotal, operationSchema, parseAmount, timeLeft } from "./schema";

describe("parseAmount", () => {
  it("reads the ways people type DZD amounts", () => {
    expect(parseAmount("12500")).toBe(12500);
    expect(parseAmount("12 500")).toBe(12500);
    expect(parseAmount("12 500 DA")).toBe(12500);
    expect(parseAmount("12 500,50")).toBe(12500.5);
    expect(parseAmount("12.500,50")).toBe(12500.5);
    expect(parseAmount("12,500.50")).toBe(12500.5);
    expect(parseAmount("1500.5")).toBe(1500.5);
    expect(parseAmount("33,33")).toBe(33.33);
    expect(parseAmount("12,500")).toBe(12500);
    expect(parseAmount("1.234.567")).toBe(1234567);
  });

  it("rounds to centimes and refuses junk", () => {
    expect(parseAmount("10,555")).toBe(10555);
    expect(parseAmount("10.555")).toBe(10.56);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(null)).toBeNull();
  });
});

describe("lineTotal", () => {
  it("matches the database rounding", () => {
    expect(lineTotal(3, 33.33)).toBe(99.99);
    expect(lineTotal(10, 150)).toBe(1500);
    expect(lineTotal(0.5, 99.99)).toBe(50);
  });
});

describe("formatDzd", () => {
  it("shows centimes only when there are some", () => {
    expect(formatDzd(12500).replace(/\s/g, " ")).toBe("12 500 DA");
    expect(formatDzd(12500.5).replace(/\s/g, " ")).toBe("12 500,50 DA");
    expect(formatDzd(-500, "en")).toBe("-500 DA");
    expect(formatDzd(500, "en", { sign: true })).toBe("+500 DA");
  });
});

describe("canEditOperation (24-hour rule)", () => {
  const now = Date.parse("2026-11-17T12:00:00Z");
  const op = (hoursAgo: number, extra: Partial<Parameters<typeof canEditOperation>[0]> = {}) => ({
    kind: "expense" as const,
    created_by: "me",
    created_at: new Date(now - hoursAgo * 3_600_000).toISOString(),
    cancelled_at: null,
    ...extra,
  });
  const member = { id: "me", admin: false };

  it("lets a member edit their own operation for 24 hours", () => {
    expect(canEditOperation(op(1), member, true, now)).toBe(true);
    expect(canEditOperation(op(23.9), member, true, now)).toBe(true);
    expect(canEditOperation(op(24.1), member, true, now)).toBe(false);
  });

  it("never lets a member edit someone else's, a cancelled one, or an adjustment", () => {
    expect(canEditOperation(op(1, { created_by: "other" }), member, true, now)).toBe(false);
    expect(canEditOperation(op(1, { cancelled_at: "2026-11-17T11:00:00Z" }), member, true, now)).toBe(false);
    expect(canEditOperation(op(1, { kind: "adjustment" }), member, true, now)).toBe(false);
  });

  it("lets admins edit anything while the year is open", () => {
    expect(canEditOperation(op(500, { created_by: "other" }), { id: "a", admin: true }, true, now)).toBe(true);
    expect(canEditOperation(op(1), { id: "a", admin: true }, false, now)).toBe(false);
  });

  it("reports the time left", () => {
    expect(timeLeft(op(3).created_at, now)).toEqual({ hours: 21, minutes: 0 });
    expect(timeLeft(op(23.5).created_at, now)).toEqual({ hours: 0, minutes: 30 });
    expect(timeLeft(op(25).created_at, now)).toBeNull();
  });
});

describe("operationSchema", () => {
  const base = {
    sheet_id: "6f1c1f9e-8c4b-4e57-9f6a-0d6f0c5b8a11",
    kind: "expense" as const,
    occurred_on: "2026-11-14",
    category: "supplies",
    label: "Pharmacie",
    lines: [{ product: "Bandages", quantity: 10, unit_price: 150 }],
  };

  it("accepts a purchase and refuses wrong categories", () => {
    expect(operationSchema.safeParse(base).success).toBe(true);
    expect(operationSchema.safeParse({ ...base, category: "sponsor" }).success).toBe(false);
  });

  it("needs exactly one line for an income", () => {
    const income = { ...base, kind: "income" as const, category: "sponsor" };
    expect(operationSchema.safeParse(income).success).toBe(true);
    expect(operationSchema.safeParse({ ...income, lines: [...base.lines, ...base.lines] }).success).toBe(false);
  });

  it("refuses zero quantities and negative prices", () => {
    expect(operationSchema.safeParse({ ...base, lines: [{ product: "x", quantity: 0, unit_price: 1 }] }).success).toBe(false);
    expect(operationSchema.safeParse({ ...base, lines: [{ product: "x", quantity: 1, unit_price: -1 }] }).success).toBe(false);
  });
});

describe("isReceiptPath", () => {
  it("only accepts receipts stored under the sheet", () => {
    const sheet = "6f1c1f9e-8c4b-4e57-9f6a-0d6f0c5b8a11";
    expect(isReceiptPath(`${sheet}/0d6f0c5b-8c4b-4e57-9f6a-6f1c1f9e8a11.jpg`, sheet)).toBe(true);
    expect(isReceiptPath(`other/0d6f0c5b-8c4b-4e57-9f6a-6f1c1f9e8a11.jpg`, sheet)).toBe(false);
    expect(isReceiptPath(`${sheet}/../../x.jpg`, sheet)).toBe(false);
  });
});
