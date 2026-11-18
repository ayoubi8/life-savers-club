"use server";

import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TOURS } from "./registry";

const input = z.object({ id: z.string().max(64), version: z.number().int().min(1).max(1000) });

/** Remembers that the signed-in person finished or skipped a tour. */
export async function markTourSeen(id: string, version: number): Promise<{ ok: boolean }> {
  const parsed = input.safeParse({ id, version });
  if (!parsed.success || !TOURS.some((tour) => tour.id === parsed.data.id)) return { ok: false };
  const { profile } = await getSessionProfile();
  if (!profile || profile.status !== "active") return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_tour_seen", { p_tour: parsed.data.id, p_version: parsed.data.version });
  return { ok: !error };
}
