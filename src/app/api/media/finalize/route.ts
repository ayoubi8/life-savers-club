import { requireSection } from "@/lib/auth";
import { getFile, type DriveFile } from "@/lib/google/drive";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDriveAccess } from "@/lib/media/drive-token";
import { driveErrorResponse, json, sameSiteOrigin } from "@/lib/media/route-helpers";
import { finalizeSchema, kindOf, MAX_FILE_BYTES, orientationOf, thumbPathFor } from "@/lib/media/schema";

export const runtime = "nodejs";

/** Size from Drive when the browser could not read it (HEIC…). Drive rotation 1/3 = 90°/270°. */
function driveSize(file: DriveFile) {
  const video = file.videoMediaMetadata;
  if (video?.width && video.height) return { width: video.width, height: video.height };
  const image = file.imageMediaMetadata;
  if (image?.width && image.height) {
    const turned = image.rotation === 1 || image.rotation === 3;
    return turned ? { width: image.height, height: image.width } : { width: image.width, height: image.height };
  }
  return { width: null, height: null };
}

/**
 * Called by the browser once Google has the whole file. Nothing the browser says about the file
 * is trusted except its measured size: the file itself is read back from Drive and must sit in
 * the folder's Drive folder with an allowed type before it is added to the library.
 */
export async function POST(request: Request) {
  if (!sameSiteOrigin(request)) return json({ error: "forbidden" }, 403);
  const ctx = await requireSection("media");
  if (!ctx) return json({ error: "unauthorized" }, 401);

  const parsed = finalizeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid" }, 400);
  const input = parsed.data;

  let access: Awaited<ReturnType<typeof getDriveAccess>>;
  try {
    access = await getDriveAccess();
  } catch (error) {
    return driveErrorResponse(error);
  }

  const { data: folder } = await ctx.supabase
    .from("media_folders")
    .select("id, drive_folder_id")
    .eq("id", input.folderId)
    .eq("account_id", access.account.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!folder) return json({ error: "not_found" }, 404);

  let file: DriveFile;
  try {
    file = await getFile(access.token, input.driveFileId);
  } catch (error) {
    return driveErrorResponse(error, access.account.id);
  }

  const kind = kindOf(file.mimeType);
  const size = Number(file.size ?? 0);
  if (file.trashed || !file.parents?.includes(folder.drive_folder_id as string)) return json({ error: "not_found" }, 404);
  if (!kind) return json({ error: "type_not_allowed" }, 400);
  if (!(size > 0) || size > MAX_FILE_BYTES) return json({ error: "too_large" }, 400);

  const fromDrive = driveSize(file);
  const width = input.width ?? fromDrive.width;
  const height = input.height ?? fromDrive.height;
  const durationS =
    input.durationS ?? (file.videoMediaMetadata?.durationMillis ? Number(file.videoMediaMetadata.durationMillis) / 1000 : null);
  const thumbPath = input.thumbPath && input.thumbPath === thumbPathFor(folder.id as string, file.id) ? input.thumbPath : null;

  const admin = createAdminClient();
  if (!admin) return json({ error: "not_configured" }, 500);

  const columns = "id, name, mime_type, kind, width, height, orientation, duration_s, size_bytes, created_at";
  const { data, error } = await admin
    .from("media_assets")
    .insert({
      folder_id: folder.id,
      drive_file_id: file.id,
      name: file.name.slice(0, 255) || "file",
      mime_type: file.mimeType,
      kind,
      width,
      height,
      orientation: orientationOf(width, height),
      duration_s: durationS == null ? null : Math.round(durationS * 100) / 100,
      size_bytes: size,
      thumb_path: thumbPath,
      uploaded_by: ctx.profile.id,
    })
    .select(columns)
    .single();

  if (error?.code === "23505") {
    // Finalize sent twice (retry after a dropped response): return the row already saved.
    const { data: existing } = await admin.from("media_assets").select(columns).eq("drive_file_id", file.id).single();
    return json({ asset: existing });
  }
  if (error || !data) return json({ error: "failed" }, 500);
  return json({ asset: data });
}
