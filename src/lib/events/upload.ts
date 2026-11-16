"use client";

import { createClient } from "@/lib/supabase/client";
import { registerMedia } from "./actions";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // before compression
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // bucket limit (Supabase free plan)
const MAX_SIDE = 2400;
const QUALITY = 0.82;

export type UploadError = "type" | "too_big" | "failed";
export type UploadedMedia = { id: string; url: string; kind: "image" | "video"; width: number | null; height: number | null };

export function mediaKind(file: File): "image" | "video" | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (VIDEO_TYPES.includes(file.type)) return "video";
  return null;
}

/**
 * Resizes big photos to 2400 px on the long side and re-encodes them as WebP,
 * which usually divides phone photos by 5-10. GIFs are kept as is (animation).
 * Falls back to the original file if the browser cannot decode it.
 */
export async function compressImage(file: File): Promise<{ blob: Blob; type: string; ext: string; width: number | null; height: number | null }> {
  const original = { blob: file as Blob, type: file.type, ext: file.type.split("/")[1].replace("jpeg", "jpg") };
  if (file.type === "image/gif") return { ...original, width: null, height: null };
  try {
    const bitmap = await createImageBitmap(file); // honours EXIF orientation in current browsers
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
    // Keep the original when re-encoding does not help (already small and not resized).
    if (!blob || blob.type !== "image/webp" || (scale === 1 && blob.size >= file.size)) {
      return { ...original, width, height };
    }
    return { blob, type: "image/webp", ext: "webp", width, height };
  } catch {
    return { ...original, width: null, height: null };
  }
}

function videoSize(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (width: number | null, height: number | null) => {
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(video.videoWidth || null, video.videoHeight || null);
    video.onerror = () => done(null, null);
    video.src = url;
  });
}

/** PUT to Supabase Storage with XHR so the UI can show upload progress. */
export async function putWithProgress(path: string, blob: Blob, type: string, onProgress?: (ratio: number) => void) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("no session");
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/event-media/${path}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("Content-Type", type);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(blob);
  });
}

/**
 * Validates, compresses (images), uploads to `event-media/events/{eventId}/…` and
 * records the file in the event's media library.
 */
export async function uploadEventMedia(
  eventId: string,
  file: File,
  options: { alt?: string; onProgress?: (ratio: number) => void } = {},
): Promise<{ ok: true; media: UploadedMedia } | { ok: false; error: UploadError }> {
  const kind = mediaKind(file);
  if (!kind) return { ok: false, error: "type" };
  if (file.size > (kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) return { ok: false, error: "too_big" };

  const prepared =
    kind === "image"
      ? await compressImage(file)
      : { blob: file as Blob, type: file.type, ext: file.type === "video/webm" ? "webm" : "mp4", ...(await videoSize(file)) };
  if (prepared.blob.size > MAX_VIDEO_BYTES) return { ok: false, error: "too_big" };

  const path = `events/${eventId}/${crypto.randomUUID()}.${prepared.ext}`;
  try {
    await putWithProgress(path, prepared.blob, prepared.type, options.onProgress);
  } catch {
    return { ok: false, error: "failed" };
  }
  const result = await registerMedia(eventId, {
    path,
    kind,
    width: prepared.width,
    height: prepared.height,
    size: prepared.blob.size,
    alt: options.alt ?? null,
  });
  if (!result.ok) return { ok: false, error: "failed" };
  return { ok: true, media: { ...result.media, kind, width: prepared.width, height: prepared.height } };
}
