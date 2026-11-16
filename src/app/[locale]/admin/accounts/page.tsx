import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENTS, isDepartment, type Role } from "@/lib/permissions";
import { AccountAccessForm } from "./account-access-form";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: "pending" | "active" | "disabled";
  department: string | null;
  sections: string[];
  created_at: string;
};

export default async function AccountsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  // The session check and the list run together; the list is only used for admins
  // (RLS limits what a non-admin could read anyway).
  const [t, tAdmin, { profile: me }, { data }] = await Promise.all([
    getTranslations({ locale, namespace: "adminAccounts" }),
    getTranslations({ locale, namespace: "admin" }),
    getSessionProfile(),
    supabase
      .from("profiles")
      .select("id, email, full_name, role, status, department, sections, created_at")
      .order("created_at", { ascending: false }),
  ]);
  if (me?.role !== "admin") return redirect({ href: "/admin", locale });
  const profiles = (data ?? []) as Profile[];
  const labels = {
    role: t("role"),
    admin: t("admin"),
    member: t("member"),
    department: t("department"),
    noDepartment: t("noDepartment"),
    departments: Object.fromEntries(DEPARTMENTS.map((d) => [d, t(`departments.${d}`)])) as Record<(typeof DEPARTMENTS)[number], string>,
    sections: t("sections"),
    sectionNames: { events: tAdmin("events"), forms: tAdmin("forms") },
    adminHint: t("adminHint"),
    memberHint: t("memberHint"),
    noSection: t("noSection"),
    activate: t("activate"),
    enable: t("enable"),
    save: t("save"),
    disable: t("disable"),
  };

  const groups = [
    { key: "pending", label: t("pending"), list: profiles.filter((p) => p.status === "pending") },
    { key: "active", label: t("active"), list: profiles.filter((p) => p.status === "active") },
    { key: "disabled", label: t("disabled"), list: profiles.filter((p) => p.status === "disabled") },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-extrabold text-blue">{t("title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-6 space-y-8">
        {groups.map((g) => (
          <section key={g.key}>
            <h2 className="mb-3 flex items-center gap-2 font-extrabold text-grey">
              {g.label}
              <span className={`rounded-full px-2 py-0.5 text-xs text-white ${g.key === "pending" ? "bg-pink" : g.key === "active" ? "bg-green" : "bg-grey"}`}>{g.list.length}</span>
            </h2>
            {g.list.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none")}</p>
            ) : (
              <ul className="space-y-2">
                {g.list.map((p) => {
                  const self = p.id === me.id;
                  return (
                    <li key={p.id} className="flex flex-col gap-3 rounded-card border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">
                          {p.full_name || p.email} {self && <span className="text-xs font-semibold text-pink">({t("you")})</span>}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">{p.email}</p>
                        <p className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold">
                          <span className={`rounded-full px-2 py-0.5 text-white ${p.role === "admin" ? "bg-blue" : "bg-grey"}`}>
                            {p.role === "admin" ? t("admin") : t("member")}
                          </span>
                          {isDepartment(p.department) && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-grey">{t(`departments.${p.department}`)}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("joined")} {new Date(p.created_at).toLocaleDateString(locale)}</p>
                      </div>
                      {!self && <AccountAccessForm account={p} labels={labels} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
