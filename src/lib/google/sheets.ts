import { answerToText, DISPLAY_TYPES, schemaFields, type FormSchema } from "@/lib/forms/schema";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEET = "Sheet1";

// Token helpers moved to ./oauth (shared with the Drive integration); re-exported for existing imports.
export { exchangeCode, refreshAccessToken, type GoogleTokens } from "./oauth";

export async function createSpreadsheet(title: string, accessToken: string) {
  const response = await fetch(SHEETS_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: { title } }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Could not create spreadsheet (${response.status})`);
  const data = (await response.json()) as { spreadsheetId?: string };
  if (!data.spreadsheetId) throw new Error("Spreadsheet id missing");
  return data.spreadsheetId;
}

export function headerRow(schema: FormSchema) {
  return [
    "Submitted at",
    ...schemaFields(schema)
      .filter((field) => !DISPLAY_TYPES.includes(field.type))
      .map((field) => field.label || field.type),
  ];
}

export function rowValues(schema: FormSchema, answers: Record<string, unknown>, submittedAt: string) {
  return [
    submittedAt,
    ...schemaFields(schema)
      .filter((field) => !DISPLAY_TYPES.includes(field.type))
      .map((field) => answerToText(answers[field.id], field)),
  ];
}

export async function appendValues(sheetId: string, accessToken: string, values: (string | number)[][]) {
  if (values.length === 0) return;
  const range = encodeURIComponent(`${SHEET}!A1`);
  const response = await fetch(
    `${SHEETS_API}/${encodeURIComponent(sheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`Could not append to spreadsheet (${response.status})`);
}

async function readHeader(sheetId: string, accessToken: string) {
  const range = encodeURIComponent(`${SHEET}!A1:ZZ1`);
  const response = await fetch(`${SHEETS_API}/${encodeURIComponent(sheetId)}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Could not read spreadsheet (${response.status})`);
  const data = (await response.json()) as { values?: unknown[][] };
  return Array.isArray(data.values?.[0]) ? data.values![0].map(String) : [];
}

export async function overwriteHeader(sheetId: string, accessToken: string, header: string[]) {
  const range = encodeURIComponent(`${SHEET}!A1`);
  const response = await fetch(
    `${SHEETS_API}/${encodeURIComponent(sheetId)}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [header] }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`Could not update header (${response.status})`);
}

/** Writes the header when missing, and rewrites it when the questions changed since. */
export async function writeHeaderRow(sheetId: string, accessToken: string, schema: FormSchema) {
  const wanted = headerRow(schema);
  const current = await readHeader(sheetId, accessToken);
  if (current.length === 0) return appendValues(sheetId, accessToken, [wanted]);
  if (JSON.stringify(current) !== JSON.stringify(wanted)) return overwriteHeader(sheetId, accessToken, wanted);
}

export async function clearSheet(sheetId: string, accessToken: string) {
  const range = encodeURIComponent(SHEET);
  const response = await fetch(`${SHEETS_API}/${encodeURIComponent(sheetId)}/values/${range}:clear`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Could not clear spreadsheet (${response.status})`);
}
