"use client";

import { IMAGE_TYPES, MAX_IMAGE_BYTES, compressImage, putWithProgress, type UploadError } from "@/lib/events/upload";

/**
 * Uploads a site image (hero, logo, sponsor logo, testimonial photo) to
 * `event-media/site/…` after compression, and returns its public URL.
 */
export async function uploadSiteImage(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<{ ok: true; url: string } | { ok: false; error: UploadError }> {
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, error: "type" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "too_big" };
  const prepared = await compressImage(file);
  const path = `site/${crypto.randomUUID()}.${prepared.ext}`;
  try {
    await putWithProgress(path, prepared.blob, prepared.type, onProgress);
  } catch {
    return { ok: false, error: "failed" };
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return { ok: true, url: `${base}/storage/v1/object/public/event-media/${path}` };
}
