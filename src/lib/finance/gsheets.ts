// Server only: Google Sheets copies of finance sheets and years, in the club Drive.
// The site is the master copy; these files are rewritten from it and shared as view-only.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createFolder, createGoogleFile, DriveError, getFile, googleReason, removePermission, shareWithUser } from "@/lib/google/drive";
import { DriveDisconnectedError, getDriveAccess, type DriveAccount } from "@/lib/media/drive-token";
import { getPeople, getYearTotals, listSheets, listSheetOperations, listYearOperations, getSheet, type LedgerRow } from "./queries";
import { adjustmentsTable, operationsTable, sheetSummaryTable, tabTitles, yearSummaryTable, type Table, type Translate } from "./tables";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";
const FINANCE_FOLDER = "Life Savers – Finance";
const FILE_LOCALE = "fr"; // the Google copies are written in French, the club's language

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;
type Access = { account: DriveAccount; token: string };
export type FinanceTarget = { kind: "sheet" | "year"; id: string };

async function sheets<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${SHEETS_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new DriveError(response.status, googleReason(await response.json().catch(() => null)));
  }
  return (await response.json()) as T;
}

const quoted = (title: string) => `'${title.replace(/'/g, "''")}'`;

/**
 * Rewrites a spreadsheet so it holds exactly `tabs`: adds missing tabs, removes others, clears,
 * writes the values as RAW (never formulas) and formats header and money columns.
 */
async function writeTabs(token: string, spreadsheetId: string, tabs: Table[]) {
  type Meta = { sheets: { properties: { sheetId: number; title: string } }[] };
  const meta = await sheets<Meta>(token, `/${spreadsheetId}?fields=sheets.properties(sheetId,title)`);
  const existing = new Map(meta.sheets.map((sheet) => [sheet.properties.title, sheet.properties.sheetId]));

  const add = tabs.filter((tab) => !existing.has(tab.title));
  if (add.length) {
    const result = await sheets<{ replies: { addSheet?: { properties: { sheetId: number; title: string } } }[] }>(
      token,
      `/${spreadsheetId}:batchUpdate`,
      { method: "POST", body: JSON.stringify({ requests: add.map((tab) => ({ addSheet: { properties: { title: tab.title } } })) }) },
    );
    for (const reply of result.replies) if (reply.addSheet) existing.set(reply.addSheet.properties.title, reply.addSheet.properties.sheetId);
  }

  const wanted = new Set(tabs.map((tab) => tab.title));
  const structure = [
    ...[...existing.entries()].filter(([title]) => !wanted.has(title)).map(([, sheetId]) => ({ deleteSheet: { sheetId } })),
    ...tabs.map((tab) => ({
      updateSheetProperties: {
        properties: {
          sheetId: existing.get(tab.title),
          gridProperties: {
            rowCount: Math.max(100, tab.rows.length + 20),
            columnCount: Math.max(26, ...tab.rows.map((row) => row.length)),
            frozenRowCount: 1,
          },
        },
        fields: "gridProperties(rowCount,columnCount,frozenRowCount)",
      },
    })),
  ];
  await sheets(token, `/${spreadsheetId}:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: structure }) });

  await sheets(token, `/${spreadsheetId}/values:batchClear`, {
    method: "POST",
    body: JSON.stringify({ ranges: tabs.map((tab) => quoted(tab.title)) }),
  });
  await sheets(token, `/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: tabs.map((tab) => ({ range: `${quoted(tab.title)}!A1`, values: tab.rows.map((row) => row.map((cell) => cell ?? "")) })),
    }),
  });

  const format = tabs.flatMap((tab) => {
    const sheetId = existing.get(tab.title)!;
    const columns = Math.max(...tab.rows.map((row) => row.length), 1);
    return [
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.93, green: 0.95, blue: 0.98 } } },
          fields: "userEnteredFormat(textFormat,backgroundColor)",
        },
      },
      ...tab.moneyColumns.map((column) => ({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 },
          cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: '#,##0.## "DA"' } } },
          fields: "userEnteredFormat.numberFormat",
        },
      })),
      { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: columns } } },
    ];
  });
  await sheets(token, `/${spreadsheetId}:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: format }) });
}

// ───────── Content ─────────

async function translator(): Promise<Translate> {
  const t = await getTranslations({ locale: FILE_LOCALE, namespace: "adminFinance" });
  return (key, values) => t(key as never, values as never);
}

async function sheetTabs(admin: Admin, sheetId: string, t: Translate) {
  const sheet = await getSheet(admin, sheetId);
  if (!sheet) return null;
  const rows = await listSheetOperations(admin, sheetId);
  const people = await getPeople(admin, rows.map((row) => row.created_by), true);
  const [operations, summary] = tabTitles([t("export.operations"), t("export.summary")]);
  return {
    name: sheet.name,
    tabs: [operationsTable(operations, rows, people, t), sheetSummaryTable(summary, sheet, rows, t)],
  };
}

/** Year workbook: summary, adjustments, then one tab per active sheet. Also used for the .xlsx download. */
export async function yearTables(db: SupabaseClient, yearId: string, t: Translate, serviceRole = true) {
  const { data: year } = await db.from("finance_years").select("id, label").eq("id", yearId).maybeSingle();
  if (!year) return null;
  const [totals, sheetList, rows] = await Promise.all([
    getYearTotals(db, yearId),
    listSheets(db, yearId),
    listYearOperations(db, yearId, true),
  ]);
  const people = await getPeople(db, rows.map((row) => row.created_by), serviceRole);
  const bySheet = new Map<string, LedgerRow[]>();
  for (const row of rows) if (row.sheet_id) bySheet.set(row.sheet_id, [...(bySheet.get(row.sheet_id) ?? []), row]);

  const [summaryTitle, adjustmentsTitle] = tabTitles([t("export.summary"), t("export.adjustments")]);
  const sheetTitles = tabTitles(sheetList.map((sheet) => sheet.name), [summaryTitle, adjustmentsTitle]);
  return {
    label: year.label as string,
    tabs: [
      yearSummaryTable(summaryTitle, year.label as string, totals, sheetList, rows, t),
      adjustmentsTable(adjustmentsTitle, rows, people, t),
      ...sheetList.map((sheet, index) => operationsTable(sheetTitles[index], bySheet.get(sheet.id) ?? [], people, t)),
    ],
  };
}

// ───────── Files ─────────

async function financeFolder(admin: Admin, access: Access) {
  const { data } = await admin.from("drive_accounts").select("finance_folder_id").eq("id", access.account.id).maybeSingle();
  const current = data?.finance_folder_id as string | null | undefined;
  if (current) {
    const folder = await getFile(access.token, current, "id,trashed").catch(() => null);
    if (folder && !folder.trashed) return current;
  }
  const { id } = await createFolder(access.token, FINANCE_FOLDER);
  await admin.from("drive_accounts").update({ finance_folder_id: id }).eq("id", access.account.id);
  return id;
}

const tableOf = (target: FinanceTarget) => (target.kind === "sheet" ? "finance_sheets" : "finance_years");

/** The target's Google file id, created in the club Drive when it has none (or belongs to an old account). */
async function ensureFile(admin: Admin, access: Access, target: FinanceTarget, title: string) {
  const { data } = await admin.from(tableOf(target)).select("gsheet_id, gsheet_account_id").eq("id", target.id).maybeSingle();
  if (data?.gsheet_id && data.gsheet_account_id === access.account.id) {
    const file = await getFile(access.token, data.gsheet_id as string, "id,trashed").catch(() => null);
    if (file && !file.trashed) return data.gsheet_id as string;
  }
  const folder = await financeFolder(admin, access);
  const { id } = await createGoogleFile(access.token, title, SPREADSHEET_MIME, folder);
  await admin.from(tableOf(target)).update({ gsheet_id: id, gsheet_account_id: access.account.id }).eq("id", target.id);
  return id;
}

/** Rewrites one Google file from the database. Returns false when the target has no file yet. */
async function refresh(admin: Admin, access: Access, target: FinanceTarget, t: Translate, create = false) {
  const content = target.kind === "sheet" ? await sheetTabs(admin, target.id, t) : await yearTables(admin, target.id, t);
  if (!content) return null;
  const title = target.kind === "sheet" ? `Finance – ${(content as { name: string }).name}` : `Finance – ${(content as { label: string }).label}`;

  let fileId: string;
  if (create) {
    fileId = await ensureFile(admin, access, target, title);
  } else {
    const { data } = await admin.from(tableOf(target)).select("gsheet_id, gsheet_account_id").eq("id", target.id).maybeSingle();
    if (!data?.gsheet_id || data.gsheet_account_id !== access.account.id) return null; // created on first "Open"
    fileId = data.gsheet_id as string;
  }
  await writeTabs(access.token, fileId, content.tabs);
  await admin.from(tableOf(target)).update({ gsheet_synced_at: new Date().toISOString() }).eq("id", target.id);
  return fileId;
}

/**
 * "Open in Google Sheets": makes sure the file exists and is current, shares it (view only)
 * with the member's Gmail, and returns its URL.
 */
export async function openInGoogleSheets(target: FinanceTarget, user: { id: string; email: string }) {
  const admin = createAdminClient();
  if (!admin) throw new DriveDisconnectedError();
  const access = await getDriveAccess();
  const fileId = await refresh(admin, access, target, await translator(), true);
  if (!fileId) throw new DriveError(404, "notFound");
  await admin.from("finance_sync").delete().eq("target", target.kind).eq("target_id", target.id);

  const email = user.email.trim().toLowerCase();
  if (email !== access.account.google_email.toLowerCase()) {
    const { data: shared } = await admin.from("finance_gsheet_shares").select("email").eq("gsheet_id", fileId).eq("email", email).maybeSingle();
    if (!shared) {
      const permission = await shareWithUser(access.token, fileId, email);
      await admin.from("finance_gsheet_shares").upsert({ gsheet_id: fileId, user_id: user.id, email, permission_id: permission.id });
    }
  }
  return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
}

/** Refreshes Google files queued by database triggers. Safe to call often (after saves, from cron). */
export async function processFinanceSync(limit = 10) {
  const admin = createAdminClient();
  if (!admin) return { refreshed: 0, failed: 0 };
  const { data: queue } = await admin.from("finance_sync").select("target, target_id, queued_at").order("queued_at").limit(limit);
  if (!queue?.length) return { refreshed: 0, failed: 0 };

  let access: Access;
  try {
    access = await getDriveAccess();
  } catch {
    return { refreshed: 0, failed: queue.length }; // stays queued until Google is connected again
  }
  const t = await translator();
  let refreshed = 0;
  let failed = 0;
  for (const item of queue) {
    try {
      await refresh(admin, access, { kind: item.target as "sheet" | "year", id: item.target_id as string }, t);
      // Only drop the entry if nothing changed while we were writing.
      await admin.from("finance_sync").delete().eq("target", item.target).eq("target_id", item.target_id).eq("queued_at", item.queued_at);
      refreshed += 1;
    } catch {
      failed += 1;
    }
  }
  return { refreshed, failed };
}

/** Removes a member's access to every finance Google file (they lost the finance section). */
export async function revokeFinanceShares(userId: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data: shares } = await admin.from("finance_gsheet_shares").select("gsheet_id, email, permission_id").eq("user_id", userId);
  if (!shares?.length) return;
  const { token } = await getDriveAccess();
  for (const share of shares) {
    try {
      await removePermission(token, share.gsheet_id as string, share.permission_id as string);
      await admin.from("finance_gsheet_shares").delete().eq("gsheet_id", share.gsheet_id).eq("email", share.email);
    } catch {
      // Left for the next attempt.
    }
  }
}
