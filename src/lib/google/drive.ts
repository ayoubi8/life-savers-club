// Thin wrappers around the Google Drive v3 REST API (scope: drive.file, so only files this app created).

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/** A Drive error with Google's reason ("notFound", "storageQuotaExceeded", "rateLimitExceeded"…). */
export class DriveError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(`Drive request failed (${status} ${reason})`);
  }
  get notFound() {
    return this.status === 404;
  }
  get quotaFull() {
    return this.reason === "storageQuotaExceeded";
  }
}

async function failure(response: Response) {
  return new DriveError(response.status, googleReason(await response.json().catch(() => null)));
}

/**
 * The most specific reason in a Google API error: "SERVICE_DISABLED" (API not enabled in the
 * Cloud project), "storageQuotaExceeded", "notFound", then the generic status.
 */
export function googleReason(body: unknown) {
  const error = (body as { error?: { errors?: { reason?: string }[]; details?: { reason?: string }[]; status?: string } } | null)?.error;
  return error?.details?.find((detail) => detail.reason)?.reason ?? error?.errors?.[0]?.reason ?? error?.status ?? "unknown";
}

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw await failure(response);
  return (await response.json()) as T;
}

const id = (value: string) => encodeURIComponent(value);

export function createFolder(token: string, name: string, parentId?: string) {
  return call<{ id: string }>(token, "/files?fields=id", {
    method: "POST",
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) }),
  });
}

/** Creates an empty Google file (e.g. a spreadsheet) inside a folder. */
export function createGoogleFile(token: string, name: string, mimeType: string, parentId?: string) {
  return call<{ id: string }>(token, "/files?fields=id", {
    method: "POST",
    body: JSON.stringify({ name, mimeType, ...(parentId ? { parents: [parentId] } : {}) }),
  });
}

/** Gives a Google account access to a file, without the notification email. */
export function shareWithUser(token: string, fileId: string, email: string, role: "reader" | "commenter" | "writer" = "reader") {
  return call<{ id: string }>(token, `/files/${id(fileId)}/permissions?sendNotificationEmail=false&fields=id`, {
    method: "POST",
    body: JSON.stringify({ role, type: "user", emailAddress: email }),
  });
}

export async function removePermission(token: string, fileId: string, permissionId: string) {
  const response = await fetch(`${API}/files/${id(fileId)}/permissions/${id(permissionId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404) throw await failure(response);
}

export function renameFile(token: string, fileId: string, name: string) {
  return call<{ id: string }>(token, `/files/${id(fileId)}?fields=id`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export function moveFile(token: string, fileId: string, fromParent: string, toParent: string) {
  const query = new URLSearchParams({ addParents: toParent, removeParents: fromParent, fields: "id" });
  return call<{ id: string }>(token, `/files/${id(fileId)}?${query}`, { method: "PATCH", body: "{}" });
}

/** Moves to the Drive trash (recoverable for 30 days from drive.google.com). */
export function trashFile(token: string, fileId: string) {
  return call<{ id: string }>(token, `/files/${id(fileId)}?fields=id`, { method: "PATCH", body: JSON.stringify({ trashed: true }) });
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  trashed?: boolean;
  imageMediaMetadata?: { width?: number; height?: number; rotation?: number };
  videoMediaMetadata?: { width?: number; height?: number; durationMillis?: string };
};

export const FILE_FIELDS =
  "id,name,mimeType,size,parents,trashed,imageMediaMetadata(width,height,rotation),videoMediaMetadata(width,height,durationMillis)";

export function getFile(token: string, fileId: string, fields = FILE_FIELDS) {
  return call<DriveFile>(token, `/files/${id(fileId)}?fields=${encodeURIComponent(fields)}`);
}

/**
 * Opens a resumable upload session and returns its URL. The browser then sends the bytes
 * straight to Google. `origin` must be the site's origin: Google only answers the browser's
 * CORS requests on that session when it was opened with the same Origin.
 */
export async function startResumableUpload(
  token: string,
  file: { name: string; mimeType: string; size: number; parentId: string },
  origin: string,
) {
  const response = await fetch(`${UPLOAD_API}/files?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": file.mimeType,
      "X-Upload-Content-Length": String(file.size),
      Origin: origin,
    },
    body: JSON.stringify({ name: file.name, mimeType: file.mimeType, parents: [file.parentId] }),
    cache: "no-store",
  });
  if (!response.ok) throw await failure(response);
  const location = response.headers.get("location");
  if (!location) throw new DriveError(502, "missing_upload_url");
  return location;
}

/** The file's bytes, as a stream. `range` is forwarded so videos can seek. */
export async function fetchMedia(token: string, fileId: string, range: string | null, signal?: AbortSignal) {
  const response = await fetch(`${API}/files/${id(fileId)}?alt=media`, {
    // identity: keep Content-Length/Content-Range valid (fetch would otherwise decompress the body).
    headers: { Authorization: `Bearer ${token}`, "Accept-Encoding": "identity", ...(range ? { Range: range } : {}) },
    cache: "no-store",
    signal,
  });
  if (!response.ok && response.status !== 206) throw await failure(response);
  return response;
}

export type DriveAbout = {
  user?: { emailAddress?: string };
  storageQuota?: { limit?: string; usage?: string };
};

export function about(token: string) {
  return call<DriveAbout>(token, `/about?fields=${encodeURIComponent("user(emailAddress),storageQuota(limit,usage)")}`);
}
