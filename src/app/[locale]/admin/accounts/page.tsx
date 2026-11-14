import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateAccount } from "./actions";

type Profile = { id: string; email: string; full_name: string | null; role: "leader" | "admin"; status: "pending" | "active" | "disabled"; created_at: string };

export default async function AccountsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  // The session check and the list run together; the list is only used for admins
  // (RLS limits what a non-admin could read anyway).
  const [t, { profile: me }, { data }] = await Promise.all([
    getTranslations({ locale, namespace: "adminAccounts" }),
    getSessionProfile(),
    supabase
      .from("profiles")
      .select("id, email, full_name, role, status, created_at")
      .order("created_at", { ascending: false }),
  ]);
  if (me?.role !== "admin") return redirect({ href: "/admin", locale });
  const profiles = (data ?? []) as Profile[];

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
                        <p className="text-xs text-muted-foreground">{t("joined")} {new Date(p.created_at).toLocaleDateString(locale)}</p>
                      </div>
                      {!self && (
                        <form action={updateAccount} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="id" value={p.id} />
                          <select name="role" defaultValue={p.role} className="rounded-lg border border-border px-2 py-2 text-sm">
                            <option value="leader">{t("leader")}</option>
                            <option value="admin">{t("admin")}</option>
                          </select>
                          {p.status !== "active" && (
                            <button name="status" value="active" className="rounded-full bg-green px-4 py-2 text-sm font-bold text-white">
                              {p.status === "disabled" ? t("enable") : t("activate")}
                            </button>
                          )}
                          {p.status === "active" && (
                            <>
                              <button name="status" value="active" className="rounded-full border border-border px-4 py-2 text-sm font-bold text-grey">OK</button>
                              <button name="status" value="disabled" className="rounded-full bg-pink px-4 py-2 text-sm font-bold text-white">{t("disable")}</button>
                            </>
                          )}
                        </form>
                      )}
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
