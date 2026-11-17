import ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";
import { requireSection } from "@/lib/auth";
import { yearTables } from "@/lib/finance/gsheets";
import { getPeople, getSheet, listSheetOperations } from "@/lib/finance/queries";
import { operationsTable, sheetSummaryTable, tabTitles, toCsv, type Table, type Translate } from "@/lib/finance/tables";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fileName(name: string) {
  const ascii = name.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "finance";
  return ascii.slice(0, 80);
}

async function workbook(tables: Table[]) {
  const book = new ExcelJS.Workbook();
  for (const table of tables) {
    const sheet = book.addWorksheet(table.title);
    table.rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    for (const column of table.moneyColumns) sheet.getColumn(column + 1).numFmt = '#,##0.## "DA"';
    sheet.columns.forEach((column) => {
      let width = 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        width = Math.max(width, Math.min(50, String(cell.value ?? "").length + 2));
      });
      column.width = width;
    });
  }
  return book.xlsx.writeBuffer();
}

/** Downloads: ?sheet=<id>&format=xlsx|csv, or ?year=<id> (xlsx, one tab per sheet). Same data as the screen. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sheetId = url.searchParams.get("sheet");
  const yearId = url.searchParams.get("year");
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fr";
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";

  const ctx = await requireSection("finance");
  if (!ctx) return new Response("Forbidden", { status: 403 });
  const intl = await getTranslations({ locale, namespace: "adminFinance" });
  const t: Translate = (key, values) => intl(key as never, values as never);

  let name: string;
  let tables: Table[];
  if (sheetId && UUID.test(sheetId)) {
    const sheet = await getSheet(ctx.supabase, sheetId);
    if (!sheet) return new Response("Not found", { status: 404 });
    const rows = await listSheetOperations(ctx.supabase, sheetId);
    const people = await getPeople(ctx.supabase, rows.map((row) => row.created_by));
    const [operations, summary] = tabTitles([t("export.operations"), t("export.summary")]);
    name = sheet.name;
    tables = [operationsTable(operations, rows, people, t), sheetSummaryTable(summary, sheet, rows, t)];
  } else if (yearId && UUID.test(yearId)) {
    const year = await yearTables(ctx.supabase, yearId, t, false);
    if (!year) return new Response("Not found", { status: 404 });
    name = `finance-${year.label}`;
    tables = year.tabs;
  } else {
    return new Response("Not found", { status: 404 });
  }

  const base = fileName(name);
  const headers = { "Cache-Control": "private, no-store" };
  if (format === "csv") {
    return new Response(toCsv(tables[0]), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.csv"` },
    });
  }
  const buffer = await workbook(tables);
  return new Response(buffer as ArrayBuffer, {
    headers: {
      ...headers,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
    },
  });
}
