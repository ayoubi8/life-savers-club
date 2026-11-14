import { NextResponse } from "next/server";
import { syncPending } from "@/lib/google/sync";

export const dynamic = "force-dynamic";

/** Called by a scheduler every few minutes: sends queued responses to Google Sheets. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncPending({ limit: 300, olderThanSeconds: 60 });
  return NextResponse.json(result);
}
