"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["pending", "active", "disabled"] as const;
const ROLES = ["leader", "admin"] as const;

/** Admin-only (enforced by RLS): change an account's status and/or role. */
export async function updateAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !STATUSES.includes(status as never) || !ROLES.includes(role as never)) return;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id === id) return; // never edit your own account here

  await supabase
    .from("profiles")
    .update({
      status,
      role,
      activated_by: status === "active" ? auth.user.id : null,
      activated_at: status === "active" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/", "layout");
}
