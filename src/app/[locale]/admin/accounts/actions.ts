"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getSessionProfile, requireSection } from "@/lib/auth";
import { revokeFinanceShares } from "@/lib/finance/gsheets";
import { isDepartment, isSection, ROLES, type Role } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["pending", "active", "disabled"] as const;

export type CredentialsResult = { ok: true } | { ok: false; error: "not_allowed" | "invalid_email" | "short_password" | "nothing" | "email_taken" | "failed" };

/**
 * Owner only: change another account's sign-in email and/or set a new password.
 * Passwords are stored hashed by Supabase, so they can be replaced but never read back.
 */
export async function updateCredentials(_prev: CredentialsResult | null, formData: FormData): Promise<CredentialsResult> {
  const { profile } = await getSessionProfile();
  if (!profile || profile.status !== "active" || profile.role !== "admin" || !profile.is_owner) return { ok: false, error: "not_allowed" };

  // Re-checked in the database (not only the cached session row) before using the service role.
  const supabase = await createClient();
  const { data: owner } = await supabase.rpc("is_owner");
  if (owner !== true) return { ok: false, error: "not_allowed" };

  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!id) return { ok: false, error: "failed" };

  const { data: current } = await supabase.from("profiles").select("email").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "failed" };

  const changes: { email?: string; email_confirm?: boolean; password?: string } = {};
  if (email && email !== current.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: "invalid_email" };
    changes.email = email;
    changes.email_confirm = true;
  }
  if (password) {
    if (password.length < 8 || password.length > 72) return { ok: false, error: "short_password" };
    changes.password = password;
  }
  if (!Object.keys(changes).length) return { ok: false, error: "nothing" };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "failed" };
  const { error } = await admin.auth.admin.updateUserById(id, changes);
  if (error) return { ok: false, error: /already|exists|registered/i.test(error.message) ? "email_taken" : "failed" };

  if (changes.email) {
    // The service role has no auth.uid(), so the owner-protection trigger lets this through.
    await admin.from("profiles").update({ email: changes.email }).eq("id", id);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Admin-only (enforced by RLS): change an account's status, role, department and sections.
 * A database trigger also refuses to demote or disable the last active admin.
 */
export async function updateAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const role = String(formData.get("role") ?? "");
  const department = String(formData.get("department") ?? "");
  if (!id || !STATUSES.includes(status as never) || !ROLES.includes(role as Role)) return;

  const context = await requireSection("accounts");
  if (!context || context.profile.id === id) return; // never edit your own account here

  // Admins see everything, so their section list is cleared to keep the data honest.
  const sections = role === "admin" ? [] : [...new Set(formData.getAll("sections").filter(isSection))];

  const { error } = await context.supabase
    .from("profiles")
    .update({
      status,
      role,
      department: isDepartment(department) ? department : null,
      sections,
      activated_by: status === "active" ? context.profile.id : null,
      activated_at: status === "active" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  // Lost the finance section (or the account): remove their access to the finance Google files.
  const keepsFinance = status === "active" && (role === "admin" || sections.includes("finance"));
  if (!error && !keepsFinance) after(() => revokeFinanceShares(id).catch(() => undefined));

  revalidatePath("/", "layout");
}
