// Server only: shared bits of the /api/media route handlers.
import { NextResponse } from "next/server";
import { DriveError } from "@/lib/google/drive";
import { DriveDisconnectedError, forgetDriveToken } from "./drive-token";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * The browser origin of a same-site request, or null. Used both as a CSRF check on POSTs and
 * as the Origin Google must see when opening an upload session the browser will write to.
 */
export function sameSiteOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = new Set<string>([new URL(request.url).origin]);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    allowed.add(`${proto}://${host}`);
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) allowed.add(process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ""));
  return allowed.has(origin) ? origin : null;
}

/** Drive failures as JSON errors the upload queue translates. */
export function driveErrorResponse(error: unknown, accountId?: string) {
  if (error instanceof DriveDisconnectedError) return json({ error: "drive_disconnected" }, 409);
  if (error instanceof DriveError) {
    if (error.status === 401 && accountId) forgetDriveToken(accountId);
    if (error.quotaFull) return json({ error: "quota_full" }, 507);
    if (error.notFound) return json({ error: "not_found" }, 404);
    if (error.status === 429 || error.reason.includes("rateLimit")) return json({ error: "rate_limited" }, 429);
  }
  return json({ error: "drive_failed" }, 502);
}
