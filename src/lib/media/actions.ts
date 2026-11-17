"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSection } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { createFolder as driveCreateFolder, DriveError, moveFile, renameFile, trashFile } from "@/lib/google/drive";
import { DriveDisconnectedError, forgetDriveToken, getDriveAccess } from "./drive-token";
import { getActiveAccount, listAssets, type AssetItem } from "./queries";
import { cleanFilters, fileNameSchema, folderNameSchema, ORIENTATIONS, type AssetFilters, type Orientation } from "./schema";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const MAX_BATCH = 100;
const uuid = z.uuid();
const uuidList = z.array(z.uuid()).min(1).max(MAX_BATCH);

/** Pages are dynamic; this only drops the client router cache of the library pages. */
function revalidateLibrary() {
  for (const locale of ["fr", "en"]) revalidatePath(`/${locale}/admin/media`, "layout");
}

/** Maps Drive and connection failures to the error keys the UI translates. */
function driveFailure(error: unknown, accountId?: string): string {
  if (error instanceof DriveDisconnectedError) return "drive_disconnected";
  if (error instanceof DriveError) {
    if (error.status === 401 && accountId) forgetDriveToken(accountId);
    if (error.quotaFull) return "quota_full";
    if (error.notFound) return "not_found";
    if (error.status === 429 || error.reason.includes("rateLimit")) return "rate_limited";
  }
  return "drive_failed";
}

/** Runs `task` over `items`, a few at a time, and reports which ones succeeded. */
async function eachLimited<T>(items: T[], task: (item: T) => Promise<void>, limit = 5) {
  const done: T[] = [];
  const failed: { item: T; error: unknown }[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next++];
        try {
          await task(item);
          done.push(item);
        } catch (error) {
          failed.push({ item, error });
        }
      }
    }),
  );
  return { done, failed };
}

/** Escapes LIKE wildcards so a folder name is compared literally. */
const literal = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Signed in with the media section, plus a live Drive connection. */
async function context() {
  const ctx = await requireSection("media");
  if (!ctx) return { error: "unauthorized" as const };
  try {
    const drive = await getDriveAccess();
    return { ...ctx, ...drive };
  } catch (error) {
    return { error: driveFailure(error) };
  }
}

async function nameTaken(
  supabase: NonNullable<Awaited<ReturnType<typeof requireSection>>>["supabase"],
  accountId: string,
  name: string,
  exceptId?: string,
) {
  let query = supabase
    .from("media_folders")
    .select("id")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .ilike("name", literal(name))
    .limit(1);
  if (exceptId) query = query.neq("id", exceptId);
  const { data } = await query;
  return (data ?? []).length > 0;
}

// ───────── Browsing ─────────

export async function loadMoreAssets(
  folderId: string,
  filters: AssetFilters,
  cursor: string,
): Promise<Result<{ items: AssetItem[]; nextCursor: string | null }>> {
  const ctx = await requireSection("media");
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!uuid.safeParse(folderId).success) return { ok: false, error: "invalid" };
  const account = await getActiveAccount(ctx.supabase);
  if (!account) return { ok: false, error: "drive_disconnected" };
  const { data: folder } = await ctx.supabase
    .from("media_folders")
    .select("id")
    .eq("id", folderId)
    .eq("account_id", account.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!folder) return { ok: false, error: "not_found" };
  return { ok: true, ...(await listAssets(ctx.supabase, folderId, cleanFilters(filters), cursor)) };
}

// ───────── Folders ─────────

export async function createFolder(rawName: string): Promise<Result<{ id: string }>> {
  const parsed = folderNameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: "invalid_name" };
  const name = parsed.data;
  const ctx = await context();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (await nameTaken(ctx.supabase, ctx.account.id, name)) return { ok: false, error: "name_taken" };

  let driveFolderId: string;
  try {
    driveFolderId = (await driveCreateFolder(ctx.token, name, ctx.account.root_folder_id)).id;
  } catch (error) {
    return { ok: false, error: driveFailure(error, ctx.account.id) };
  }

  const { data, error } = await ctx.supabase
    .from("media_folders")
    .insert({ account_id: ctx.account.id, name, drive_folder_id: driveFolderId, created_by: ctx.profile.id })
    .select("id")
    .single();
  if (error || !data) {
    // Someone created the same name at the same moment: don't leave an orphan folder in Drive.
    await trashFile(ctx.token, driveFolderId).catch(() => undefined);
    return { ok: false, error: error?.code === "23505" ? "name_taken" : "failed" };
  }
  revalidateLibrary();
  return { ok: true, id: data.id as string };
}

async function loadFolder(ctx: Exclude<Awaited<ReturnType<typeof context>>, { error: string }>, folderId: string) {
  if (!uuid.safeParse(folderId).success) return null;
  const { data } = await ctx.supabase
    .from("media_folders")
    .select("id, name, drive_folder_id")
    .eq("id", folderId)
    .eq("account_id", ctx.account.id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as { id: string; name: string; drive_folder_id: string } | null) ?? null;
}

export async function renameFolder(folderId: string, rawName: string): Promise<Result> {
  const parsed = folderNameSchema.safeParse(rawName);
  if (!parsed.success) return { ok: false, error: "invalid_name" };
  const ctx = await context();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const folder = await loadFolder(ctx, folderId);
  if (!folder) return { ok: false, error: "not_found" };
  if (folder.name === parsed.data) return { ok: true };
  if (await nameTaken(ctx.supabase, ctx.account.id, parsed.data, folder.id)) return { ok: false, error: "name_taken" };

  try {
    await renameFile(ctx.token, folder.drive_folder_id, parsed.data);
  } catch (error) {
    return { ok: false, error: driveFailure(error, ctx.account.id) };
  }
  const { error } = await ctx.supabase.from("media_folders").update({ name: parsed.data }).eq("id", folder.id);
  if (error) return { ok: false, error: error.code === "23505" ? "name_taken" : "failed" };
  revalidateLibrary();
  return { ok: true };
}

type Ctx = Exclude<Awaited<ReturnType<typeof context>>, { error: string }>;

/** Trashes the Drive folder (Drive trashes its files with it) and hides everything from the library. */
async function trashFolderNow(ctx: Ctx, folder: { id: string; drive_folder_id: string }): Promise<string | null> {
  try {
    await trashFile(ctx.token, folder.drive_folder_id);
  } catch (error) {
    if (!(error instanceof DriveError && error.notFound)) return driveFailure(error, ctx.account.id);
  }
  const now = new Date().toISOString();
  const { error: assetsError } = await ctx.supabase.from("media_assets").update({ deleted_at: now }).eq("folder_id", folder.id).is("deleted_at", null);
  if (assetsError) return "failed";
  const { error } = await ctx.supabase.from("media_folders").update({ deleted_at: now }).eq("id", folder.id);
  return error ? "failed" : null;
}

/**
 * Admins delete the folder and every file in it (Drive trash, recoverable for 30 days).
 * Other members send a request that an admin approves from the library page.
 */
export async function deleteFolder(folderId: string): Promise<Result<{ requested: boolean }>> {
  const ctx = await context();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const folder = await loadFolder(ctx, folderId);
  if (!folder) return { ok: false, error: "not_found" };

  if (!isAdmin(ctx.profile)) {
    const { error } = await ctx.supabase.from("media_delete_requests").insert({ folder_id: folder.id, requested_by: ctx.profile.id });
    // 23505: this folder already waits for an admin.
    if (error && error.code !== "23505") return { ok: false, error: "failed" };
    return { ok: true, requested: true };
  }

  const failure = await trashFolderNow(ctx, folder);
  if (failure) return { ok: false, error: failure };
  revalidateLibrary();
  return { ok: true, requested: false };
}

// ───────── Files ─────────

type AssetRow = { id: string; name: string; drive_file_id: string; folder_id: string; folder: { drive_folder_id: string; account_id: string } | null };

async function loadAssets(ctx: Exclude<Awaited<ReturnType<typeof context>>, { error: string }>, ids: string[]) {
  const { data } = await ctx.supabase
    .from("media_assets")
    .select("id, name, drive_file_id, folder_id, folder:media_folders(drive_folder_id, account_id)")
    .in("id", ids)
    .is("deleted_at", null);
  return ((data ?? []) as unknown as AssetRow[]).filter((row) => row.folder?.account_id === ctx.account.id);
}

/** Renames a file; the original extension is kept if the new name drops it. */
export async function renameAsset(assetId: string, rawName: string): Promise<Result<{ name: string }>> {
  const parsed = fileNameSchema.safeParse(rawName);
  if (!parsed.success || !uuid.safeParse(assetId).success) return { ok: false, error: "invalid_name" };
  const ctx = await context();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const [asset] = await loadAssets(ctx, [assetId]);
  if (!asset) return { ok: false, error: "not_found" };

  const extension = asset.name.includes(".") ? asset.name.slice(asset.name.lastIndexOf(".")) : "";
  const name = extension && !parsed.data.toLowerCase().endsWith(extension.toLowerCase()) ? `${parsed.data}${extension}` : parsed.data;
  if (name.length > 255) return { ok: false, error: "invalid_name" };

  try {
    await renameFile(ctx.token, asset.drive_file_id, name);
  } catch (error) {
    return { ok: false, error: driveFailure(error, ctx.account.id) };
  }
  const { error } = await ctx.supabase.from("media_assets").update({ name }).eq("id", asset.id);
  if (error) return { ok: false, error: "failed" };
  revalidateLibrary();
  return { ok: true, name };
}

export async function moveAssets(assetIds: string[], targetFolderId: string): Promise<Result<{ moved: number; failed: number }>> {
  if (!uuidList.safeParse(assetIds).success) return { ok: false, error: "invalid" };
  const ctx = await context();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const target = await loadFolder(ctx, targetFolderId);
  if (!target) return { ok: false, error: "not_found" };

  const assets = (await loadAssets(ctx, assetIds)).filter((asset) => asset.folder_id !== target.id);
  const { done, failed } = await eachLimited(assets, (asset) =>
    moveFile(ctx.token, asset.drive_file_id, asset.folder!.drive_folder_id, target.drive_folder_id).then(() => undefined),
  );
  if (done.length) {
    const { error } = await ctx.supabase.from("media_assets").update({ folder_id: target.id }).in("id", done.map((asset) => asset.id));
    if (error) return { ok: false, error: "failed" };
    revalidateLibrary();
  }
  if (!done.length && failed.length) return { ok: false, error: driveFailure(failed[0].error, ctx.account.id) };
  return { ok: true, moved: done.length, failed: failed.length };
}

/** Manual fix when the browser could not read a file's size (HEIC, some MOV). */
export async function setOrientation(assetId: string, orientation: Orientation | null): Promise<Result> {
  if (!uuid.safeParse(assetId).success) return { ok: false, error: "invalid" };
  if (orientation !== null && !ORIENTATIONS.includes(orientation)) return { ok: false, error: "invalid" };
  const ctx = await requireSection("media");
  if (!ctx) return { ok: false, error: "unauthorized" };
  const { error } = await ctx.supabase.from("media_assets").update({ orientation }).eq("id", assetId).is("deleted_at", null);
  if (error) return { ok: false, error: "failed" };
  revalidateLibrary();
  return { ok: true };
}

/** Moves files to the Drive trash and hides them from the library. Failures are reported per file. */
async function trashAssetsNow(ctx: Ctx, assets: AssetRow[]) {
  const { done, failed } = await eachLimited(assets, async (asset) => {
    try {
      await trashFile(ctx.token, asset.drive_file_id);
    } catch (error) {
      // Already gone from Drive: still remove it from the library.
      if (!(error instanceof DriveError && error.notFound)) throw error;
    }
  });
  if (done.length) {
    const { error } = await ctx.supabase
      .from("media_assets")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", done.map((asset) => asset.id));
    if (error) return { done: [], failed, error: "failed" };
  }
  return { done, failed, error: null };
}

/**
 * Admins move files to the Drive trash (recoverable for 30 days) at once.
 * Other members send a request per folder that an admin approves.
 */
export async function trashAssets(assetIds: string[]): Promise<Result<{ deleted: number; failed: number; requested: boolean }>> {
  if (!uuidList.safeParse(assetIds).success) return { ok: false, error: "invalid" };
  const ctx = await context();
  if ("error" in ctx) return { ok: false, error: ctx.error! };

  const assets = await loadAssets(ctx, assetIds);
  if (!assets.length) return { ok: false, error: "not_found" };

  if (!isAdmin(ctx.profile)) {
    const byFolder = new Map<string, string[]>();
    for (const asset of assets) byFolder.set(asset.folder_id, [...(byFolder.get(asset.folder_id) ?? []), asset.id]);
    const { error } = await ctx.supabase
      .from("media_delete_requests")
      .insert([...byFolder].map(([folder_id, asset_ids]) => ({ folder_id, asset_ids, requested_by: ctx.profile.id })));
    if (error) return { ok: false, error: "failed" };
    return { ok: true, deleted: 0, failed: 0, requested: true };
  }

  const { done, failed, error } = await trashAssetsNow(ctx, assets);
  if (error) return { ok: false, error };
  if (done.length) revalidateLibrary();
  if (!done.length && failed.length) return { ok: false, error: driveFailure(failed[0].error, ctx.account.id) };
  return { ok: true, deleted: done.length, failed: failed.length, requested: false };
}

// ───────── Deletion requests (admins) ─────────

async function loadPendingRequest(ctx: Ctx, requestId: string) {
  if (!uuid.safeParse(requestId).success) return null;
  const { data } = await ctx.supabase
    .from("media_delete_requests")
    .select("id, folder_id, asset_ids")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();
  return (data as { id: string; folder_id: string; asset_ids: string[] | null } | null) ?? null;
}

async function closeRequest(ctx: Pick<Ctx, "supabase" | "profile">, requestId: string, status: "approved" | "rejected") {
  const { error } = await ctx.supabase
    .from("media_delete_requests")
    .update({ status, decided_by: ctx.profile.id, decided_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending");
  return !error;
}

/** Carries out the deletion a member asked for. */
export async function approveDeleteRequest(requestId: string): Promise<Result<{ failed: number }>> {
  const ctx = await context();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!isAdmin(ctx.profile)) return { ok: false, error: "unauthorized" };
  const request = await loadPendingRequest(ctx, requestId);
  if (!request) return { ok: false, error: "not_found" };

  let failedCount = 0;
  if (request.asset_ids) {
    const assets = await loadAssets(ctx, request.asset_ids);
    const { done, failed, error } = await trashAssetsNow(ctx, assets);
    if (error) return { ok: false, error };
    // Nothing could be trashed: keep the request open so it can be tried again.
    if (!done.length && failed.length) return { ok: false, error: driveFailure(failed[0].error, ctx.account.id) };
    failedCount = failed.length;
  } else {
    const folder = await loadFolder(ctx, request.folder_id);
    if (folder) {
      const failure = await trashFolderNow(ctx, folder);
      if (failure) return { ok: false, error: failure };
    }
  }
  if (!(await closeRequest(ctx, request.id, "approved"))) return { ok: false, error: "failed" };
  revalidateLibrary();
  return { ok: true, failed: failedCount };
}

export async function rejectDeleteRequest(requestId: string): Promise<Result> {
  const ctx = await requireSection("media");
  if (!ctx) return { ok: false, error: "unauthorized" };
  if (!isAdmin(ctx.profile)) return { ok: false, error: "unauthorized" };
  if (!uuid.safeParse(requestId).success) return { ok: false, error: "invalid" };
  if (!(await closeRequest(ctx, requestId, "rejected"))) return { ok: false, error: "failed" };
  revalidateLibrary();
  return { ok: true };
}
