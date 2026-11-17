import { requireSection } from "@/lib/auth";
import { DriveError, fetchMedia } from "@/lib/google/drive";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDriveAccess } from "@/lib/media/drive-token";
import { driveErrorResponse } from "@/lib/media/route-helpers";
import { contentDisposition } from "@/lib/media/schema";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORWARDED = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];

/**
 * Streams a library file from Drive (files are private, so the browser cannot load them from
 * Google directly). The Range header is forwarded so videos can seek; nothing is buffered here.
 * ?download=1 asks the browser to save the file instead of showing it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const ctx = await requireSection("media");
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const { data: asset } = await ctx.supabase
    .from("media_assets")
    .select("id, name, mime_type, drive_file_id, folder:media_folders(account_id)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!asset) return new Response("Not found", { status: 404 });

  let access: Awaited<ReturnType<typeof getDriveAccess>>;
  try {
    access = await getDriveAccess();
  } catch (error) {
    return driveErrorResponse(error);
  }
  // Files of a previously connected account stay hidden until that account is active again.
  const folder = asset.folder as unknown as { account_id: string } | null;
  if (folder?.account_id !== access.account.id) return new Response("Not found", { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetchMedia(access.token, asset.drive_file_id as string, request.headers.get("range"), request.signal);
  } catch (error) {
    if (error instanceof DriveError && error.notFound) {
      // Deleted by hand in drive.google.com: drop it from the library too.
      await createAdminClient()?.from("media_assets").update({ deleted_at: new Date().toISOString() }).eq("id", asset.id);
      return new Response("Not found", { status: 404 });
    }
    if (error instanceof DriveError && error.status === 416) {
      return new Response(null, { status: 416, headers: { "Content-Range": request.headers.get("range") ?? "" } });
    }
    return driveErrorResponse(error, access.account.id);
  }

  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Content-Type", (asset.mime_type as string) || headers.get("content-type") || "application/octet-stream");
  headers.set("Accept-Ranges", "bytes");
  const download = new URL(request.url).searchParams.get("download") === "1";
  headers.set("Content-Disposition", contentDisposition(asset.name as string, download));
  // Private to the signed-in browser; never stored by shared caches.
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(upstream.body, { status: upstream.status, headers });
}
