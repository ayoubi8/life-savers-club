import { requireSection } from "@/lib/auth";
import { about, startResumableUpload } from "@/lib/google/drive";
import { getDriveAccess } from "@/lib/media/drive-token";
import { driveErrorResponse, json, sameSiteOrigin } from "@/lib/media/route-helpers";
import { uploadSessionSchema } from "@/lib/media/schema";

export const runtime = "nodejs";

/**
 * Opens a resumable upload in the folder's Drive folder and hands its URL to the browser,
 * which then sends the bytes straight to Google (they never pass through this server).
 */
export async function POST(request: Request) {
  const origin = sameSiteOrigin(request);
  if (!origin) return json({ error: "forbidden" }, 403);

  const ctx = await requireSection("media");
  if (!ctx) return json({ error: "unauthorized" }, 401);

  const parsed = uploadSessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error = issue?.path[0] === "mimeType" ? "type_not_allowed" : issue?.path[0] === "size" ? "too_large" : "invalid";
    return json({ error }, 400);
  }
  const { folderId, name, mimeType, size } = parsed.data;

  let access: Awaited<ReturnType<typeof getDriveAccess>>;
  try {
    access = await getDriveAccess();
  } catch (error) {
    return driveErrorResponse(error);
  }

  const { data: folder } = await ctx.supabase
    .from("media_folders")
    .select("drive_folder_id")
    .eq("id", folderId)
    .eq("account_id", access.account.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!folder) return json({ error: "not_found" }, 404);

  // Refuse at once when the file cannot fit, instead of failing after a long upload.
  // No limit (unlimited plans) or an unreadable quota: Google still refuses at upload time if full.
  const quota = await about(access.token)
    .then((info) => info.storageQuota)
    .catch(() => undefined);
  if (quota?.limit && Number(quota.limit) - Number(quota.usage ?? 0) < size) {
    return json({ error: "not_enough_space" }, 507);
  }

  try {
    const uploadUrl = await startResumableUpload(
      access.token,
      { name, mimeType, size, parentId: folder.drive_folder_id as string },
      origin,
    );
    return json({ uploadUrl });
  } catch (error) {
    return driveErrorResponse(error, access.account.id);
  }
}
