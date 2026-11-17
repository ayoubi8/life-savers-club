import { NextResponse } from "next/server";
import { requireSection } from "@/lib/auth";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opens an operation's receipt through a short-lived signed link (private bucket). */
export async function GET(_request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await params;
  if (!UUID.test(operationId)) return new Response("Not found", { status: 404 });
  const ctx = await requireSection("finance");
  if (!ctx) return new Response("Forbidden", { status: 403 });

  const { data: operation } = await ctx.supabase.from("finance_operations").select("receipt_path").eq("id", operationId).maybeSingle();
  if (!operation?.receipt_path) return new Response("Not found", { status: 404 });
  const { data } = await ctx.supabase.storage.from("finance-receipts").createSignedUrl(operation.receipt_path as string, 300);
  if (!data?.signedUrl) return new Response("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
