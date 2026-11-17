"use client";

import { createClient } from "@/lib/supabase/client";
import { kindOf, MAX_FILE_BYTES, mimeOf, thumbPathFor, type MediaKind, type Orientation } from "./schema";

// Google requires chunks in multiples of 256 KiB (except the last one).
const CHUNK = 32 * 256 * 1024; // 8 MiB
// While the device is online but Google cannot be reached: retry with growing pauses
// (2 s, 4 s, 8 s, 16 s, then every 30 s), about 5 minutes in total. While the device is
// offline, wait for the connection without counting it as a failure.
const MAX_FAILURES = 12;
const MAX_PAUSE = 30_000;
const THUMB_SIDE = 480;
const READ_TIMEOUT = 20_000;

export type UploadedAsset = {
  id: string;
  name: string;
  mime_type: string;
  kind: MediaKind;
  width: number | null;
  height: number | null;
  orientation: Orientation | null;
  duration_s: number | null;
  size_bytes: number;
  created_at: string;
};

export type UploadResult = { ok: true; asset: UploadedAsset; thumb: Blob | null } | { ok: false; error: string };

export type FileInfo = {
  mimeType: string;
  kind: MediaKind;
  width: number | null;
  height: number | null;
  durationS: number | null;
  thumb: Blob | null;
};

/**
 * What is needed to continue an upload later: the measured file details and Google's upload
 * session (valid about a week). Kept by the queue so "Retry" resumes instead of restarting.
 */
export type UploadState = { info: FileInfo; uploadUrl: string };

class UploadError extends Error {}

const aborted = () => new DOMException("Aborted", "AbortError");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A pause that ends early if the upload is canceled. */
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(aborted());
    const cancel = () => {
      clearTimeout(timer);
      reject(aborted());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    signal.addEventListener("abort", cancel, { once: true });
  });
}

/** Resolves when the browser is back online (at once if it already is). */
function waitForOnline(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(aborted());
    if (navigator.onLine) return resolve();
    const cancel = () => {
      window.removeEventListener("online", online);
      reject(aborted());
    };
    const online = () => {
      signal.removeEventListener("abort", cancel);
      resolve();
    };
    window.addEventListener("online", online, { once: true });
    signal.addEventListener("abort", cancel, { once: true });
  });
}

function withTimeout<T>(promise: Promise<T>, fallback: T, ms = READ_TIMEOUT) {
  return Promise.race([promise, sleep(ms).then(() => fallback)]);
}

/** Draws `source` into a small WebP (JPEG where the browser cannot encode WebP). */
async function thumbnail(source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, THUMB_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.8));
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return webp;
  return encode("image/jpeg");
}

async function readImage(file: File) {
  try {
    // from-image: phone photos saved sideways with a rotation flag are measured the way they display.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = bitmap;
    const thumb = await thumbnail(bitmap, width, height).catch(() => null);
    bitmap.close();
    return { width, height, durationS: null, thumb };
  } catch {
    // HEIC in most browsers: the server reads the size from Drive instead.
    return { width: null, height: null, durationS: null, thumb: null };
  }
}

function readVideo(file: File) {
  return new Promise<Omit<FileInfo, "mimeType" | "kind">>((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let size = { width: null as number | null, height: null as number | null, durationS: null as number | null };
    let finished = false;
    // If no frame can be drawn in time, keep the size already read and skip the thumbnail.
    const timer = setTimeout(() => finish(null), READ_TIMEOUT - 2_000);
    const finish = (thumb: Blob | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve({ ...size, thumb });
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      // Browsers apply the rotation flag, so a vertical phone video reports a taller height.
      size = {
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        durationS: Number.isFinite(video.duration) ? video.duration : null,
      };
      video.currentTime = Math.min(1, (size.durationS ?? 0) / 4);
    };
    video.onseeked = () => {
      if (!size.width || !size.height) return finish(null);
      thumbnail(video, size.width, size.height).then(finish, () => finish(null));
    };
    video.onerror = () => finish(null); // codec the browser cannot decode (e.g. HEVC on some PCs)
    video.src = url;
  });
}

async function readFileInfo(file: File): Promise<FileInfo> {
  const mimeType = mimeOf(file);
  const kind = kindOf(mimeType);
  if (!kind) throw new UploadError("type_not_allowed");
  if (file.size <= 0) throw new UploadError("invalid");
  if (file.size > MAX_FILE_BYTES) throw new UploadError("too_large");
  const empty = { width: null, height: null, durationS: null, thumb: null };
  const info = await withTimeout(kind === "image" ? readImage(file) : readVideo(file), empty);
  return { mimeType, kind, ...info };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new UploadError("network"); // offline: Retry continues from the saved state
  });
  const data =(await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new UploadError(data.error ?? "failed");
  return data;
}

type ChunkResponse = { status: number; range: string | null; body: string };

/** One PUT to the upload session; XHR rather than fetch for upload progress events. */
function put(url: string, body: Blob | null, contentRange: string, signal: AbortSignal, onProgress?: (loaded: number) => void) {
  return new Promise<ChunkResponse>((resolve, reject) => {
    if (signal.aborted) return reject(aborted());
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Range", contentRange);
    if (onProgress) xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      signal.removeEventListener("abort", abort);
      resolve({ status: xhr.status, range: xhr.getResponseHeader("Range"), body: xhr.responseText });
    };
    xhr.onerror = () => {
      signal.removeEventListener("abort", abort);
      resolve({ status: 0, range: null, body: "" });
    };
    xhr.onabort = () => reject(aborted());
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(body);
  });
}

/** "bytes=0-1048575" → 1048576 (the next byte Google expects). */
function nextByte(range: string | null) {
  const match = range?.match(/bytes=\d+-(\d+)/);
  return match ? Number(match[1]) + 1 : null;
}

function fileId(response: ChunkResponse) {
  try {
    const id = (JSON.parse(response.body) as { id?: string }).id;
    if (id) return id;
  } catch {
    // fall through
  }
  throw new UploadError("drive_failed");
}

type ChunkOptions = {
  signal: AbortSignal;
  onProgress: (sent: number) => void;
  onWaiting: (waiting: boolean) => void;
  /** Ask Google how much it already has before sending (an earlier attempt of this upload). */
  resume: boolean;
};

/** Asks Google how far the session got: the next byte to send, or the file id when complete. */
async function sessionStatus(url: string, total: number, signal: AbortSignal): Promise<{ done: string } | { offset: number } | null> {
  const response = await put(url, null, `bytes */${total}`, signal);
  if (response.status === 200 || response.status === 201) return { done: fileId(response) };
  if (response.status === 308) return { offset: nextByte(response.range) ?? 0 };
  if (response.status === 404 || response.status === 410) throw new UploadError("session_expired");
  return null; // could not tell (still offline…): the next chunk attempt will find out
}

/**
 * Sends the file to Google in 8 MiB chunks. When the connection drops it waits (as long as
 * the device is offline), asks Google how much arrived, and continues from there.
 */
export async function sendChunks(url: string, file: File, options: ChunkOptions) {
  const { signal, onProgress, onWaiting } = options;
  const total = file.size;
  let offset = 0;
  let failures = 0;

  if (options.resume) {
    const status = await sessionStatus(url, total, signal);
    if (status && "done" in status) return status.done;
    if (status) offset = status.offset;
    onProgress(offset);
  }

  while (true) {
    const end = Math.min(offset + CHUNK, total);
    const response = await put(url, file.slice(offset, end), `bytes ${offset}-${end - 1}/${total}`, signal, (loaded) =>
      onProgress(offset + loaded),
    );
    if (response.status === 200 || response.status === 201) {
      onWaiting(false);
      return fileId(response);
    }
    if (response.status === 308) {
      offset = nextByte(response.range) ?? end;
      if (failures) onWaiting(false);
      failures = 0;
      onProgress(offset);
      continue;
    }
    if (response.status === 404 || response.status === 410) throw new UploadError("session_expired");
    const retryable = response.status === 0 || response.status === 408 || response.status === 429 || response.status >= 500;
    if (!retryable) throw new UploadError(response.status === 403 ? "quota_full" : "drive_failed");

    // Connection problem: show "waiting", then continue from what Google really has.
    onWaiting(true);
    if (!navigator.onLine) {
      await waitForOnline(signal);
      await pause(1_000, signal); // let the network settle
    } else {
      if (++failures > MAX_FAILURES) throw new UploadError("network");
      await pause(Math.min(MAX_PAUSE, 1000 * 2 ** failures), signal);
    }
    const status = await sessionStatus(url, total, signal);
    if (status && "done" in status) {
      onWaiting(false);
      return status.done;
    }
    if (status) offset = status.offset;
    onProgress(offset);
  }
}

/**
 * Full upload of one file: measure it, open a Drive session, send the bytes, save the
 * thumbnail, then let the server check the file and add it to the folder.
 * With `state` (from an earlier attempt) it skips what was done and continues the same
 * Google upload, so a retry after a long outage resumes instead of starting from 0 %.
 */
export async function uploadToLibrary(
  folderId: string,
  file: File,
  options: {
    signal: AbortSignal;
    onProgress: (fraction: number) => void;
    onStage?: (stage: "reading" | "sending" | "waiting" | "saving") => void;
    state?: UploadState;
    onState?: (state: UploadState) => void;
  },
): Promise<UploadResult> {
  try {
    const stopIfCanceled = () => {
      if (options.signal.aborted) throw aborted();
    };
    options.onStage?.("reading");
    const info = options.state?.info ?? (await readFileInfo(file));
    stopIfCanceled();

    const openSession = async () => {
      const { uploadUrl } = await postJson<{ uploadUrl: string }>("/api/media/upload-session", {
        folderId,
        name: file.name,
        mimeType: info.mimeType,
        size: file.size,
      });
      options.onState?.({ info, uploadUrl });
      return uploadUrl;
    };

    options.onStage?.("sending");
    const chunkOptions = {
      signal: options.signal,
      onProgress: (sent: number) => options.onProgress(sent / file.size),
      onWaiting: (waiting: boolean) => options.onStage?.(waiting ? "waiting" : "sending"),
    };
    let driveFileId: string;
    const saved = options.state?.uploadUrl;
    if (saved) {
      try {
        driveFileId = await sendChunks(saved, file, { ...chunkOptions, resume: true });
      } catch (error) {
        // Google forgot the session (over a week old): start this file again from 0 %.
        if (!(error instanceof UploadError && error.message === "session_expired")) throw error;
        options.onProgress(0);
        driveFileId = await sendChunks(await openSession(), file, { ...chunkOptions, resume: false });
      }
    } else {
      driveFileId = await sendChunks(await openSession(), file, { ...chunkOptions, resume: false });
    }

    stopIfCanceled();
    options.onStage?.("saving");
    let thumbPath: string | null = null;
    if (info.thumb) {
      const path = thumbPathFor(folderId, driveFileId);
      const { error } = await createClient()
        .storage.from("media-thumbs")
        .upload(path, info.thumb, { upsert: true, contentType: info.thumb.type, cacheControl: "31536000" });
      if (!error) thumbPath = path; // a missing thumbnail is not worth failing the upload for
    }

    const { asset } = await postJson<{ asset: UploadedAsset }>("/api/media/finalize", {
      folderId,
      driveFileId,
      width: info.width,
      height: info.height,
      durationS: info.durationS == null ? null : Math.round(info.durationS * 100) / 100,
      thumbPath,
    });
    return { ok: true, asset, thumb: thumbPath ? info.thumb : null };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return { ok: false, error: "canceled" };
    return { ok: false, error: error instanceof UploadError ? error.message : "failed" };
  }
}
