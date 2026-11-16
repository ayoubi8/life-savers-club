"use client";

import { IMAGE_TYPES, MAX_IMAGE_BYTES, compressImage, putWithProgress, type UploadError, type UploadedMedia } from "@/lib/events/upload";
import { registerDepartmentMedia } from "./actions";

/** Where a portrait is stored: a bureau seat, a department leader, or a department member. */
export type PhotoFolder =
  | { kind: "bureau"; position: string }
  | { kind: "leader"; departmentId: string }
  | { kind: "member"; departmentId: string };

function folderPath(folder: PhotoFolder) {
  if (folder.kind === "bureau") return `team/bureau/${folder.position}`;
  return `team/departments/${folder.departmentId}/${folder.kind === "leader" ? "leader" : "members"}`;
}

function publicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/event-media/${path}`;
}

/** Compresses and uploads a portrait; the URL is saved with the person (old files are removed on save). */
export async function uploadTeamPhoto(
  folder: PhotoFolder,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<{ ok: true; url: string } | { ok: false; error: UploadError }> {
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, error: "type" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "too_big" };
  const prepared = await compressImage(file);
  const path = `${folderPath(folder)}/${crypto.randomUUID()}.${prepared.ext}`;
  try {
    await putWithProgress(path, prepared.blob, prepared.type, onProgress);
  } catch {
    return { ok: false, error: "failed" };
  }
  return { ok: true, url: publicUrl(path) };
}

/**
 * Uploads a team photo (images only) to `team/departments/{id}/gallery/…` and records it
 * in the department's library. Same signature as uploadEventMedia, so the content editor
 * can use either.
 */
export async function uploadDepartmentMedia(
  departmentId: string,
  file: File,
  options: { alt?: string; onProgress?: (ratio: number) => void } = {},
): Promise<{ ok: true; media: UploadedMedia } | { ok: false; error: UploadError }> {
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, error: "type" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "too_big" };
  const prepared = await compressImage(file);
  const path = `team/departments/${departmentId}/gallery/${crypto.randomUUID()}.${prepared.ext}`;
  try {
    await putWithProgress(path, prepared.blob, prepared.type, options.onProgress);
  } catch {
    return { ok: false, error: "failed" };
  }
  const result = await registerDepartmentMedia(departmentId, {
    path,
    width: prepared.width,
    height: prepared.height,
    size: prepared.blob.size,
    alt: options.alt ?? null,
  });
  if (!result.ok) return { ok: false, error: "failed" };
  return { ok: true, media: { ...result.media, kind: "image", width: prepared.width, height: prepared.height } };
}
