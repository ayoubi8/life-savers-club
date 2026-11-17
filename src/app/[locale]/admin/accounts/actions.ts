"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireSection } from "@/lib/auth";
import { revokeFinanceShares } from "@/lib/finance/gsheets";
import { isDepartment, isSection, ROLES, type Role } from "@/lib/permissions";

const STATUSES = ["pending", "active", "disabled"] as const;

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
