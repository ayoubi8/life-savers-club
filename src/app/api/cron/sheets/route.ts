import { NextResponse } from "next/server";
import { processFinanceSync } from "@/lib/finance/gsheets";
import { syncPending } from "@/lib/google/sync";

export const dynamic = "force-dynamic";

/** Called by a scheduler every few minutes: sends queued form responses and finance changes to Google Sheets. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [result, finance] = await Promise.all([syncPending({ limit: 300, olderThanSeconds: 60 }), processFinanceSync(50)]);
  return NextResponse.json({ ...result, finance });
}
