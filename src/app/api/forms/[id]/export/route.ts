import ExcelJS from "exceljs";
import { requireSection } from "@/lib/auth";
import {
  answerToText,
  DISPLAY_TYPES,
  isUuid,
  parseSchema,
  schemaFields,
} from "@/lib/forms/schema";
import { fetchResponses, parseFilters } from "@/lib/forms/responses-query";

export const runtime = "nodejs";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/** ?format=csv|xlsx plus the same filters as the Results page (q, status, from, to). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });

  const context = await requireSection("forms");
  if (!context) return new Response("Forbidden", { status: 403 });
  const { supabase } = context;

  const { data: form } = await supabase
    .from("forms")
    .select("id, slug, title, schema")
    .eq("id", id)
    .maybeSingle();
  if (!form) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams.entries()));
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const schema = parseSchema(form.schema);
  const fields = schemaFields(schema).filter((field) => !DISPLAY_TYPES.includes(field.type));
  const { rows: found } = await fetchResponses(supabase, id, schema, filters, "all");
  const responses = [...found].reverse(); // oldest first

  const header = [
    "Submitted at",
    "Status",
    "Name",
    "Email",
    ...fields.map((field) => field.label || field.type),
    "Note",
    "Synced to Google Sheets",
  ];
  const body = responses.map((response) => [
    response.created_at,
    response.status,
    response.respondent_name ?? "",
    response.respondent_email ?? "",
    ...fields.map((field) => answerToText(response.answers[field.id], field)),
    response.review_note ?? "",
    response.synced_to_sheet ? "yes" : "no",
  ]);

  const base = form.slug || "form";

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Responses");
    sheet.addRow(header).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    for (const row of body) sheet.addRow(row);
    sheet.columns.forEach((column) => {
      column.width = 22;
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}-responses.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = [header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}-responses.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
