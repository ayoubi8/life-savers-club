import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Images,
  PanelsTopLeft,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

type CardKey = "events" | "forms" | "media" | "finance" | "team" | "pages" | "accounts";

const LOOK: Record<CardKey, { icon: LucideIcon; color: string }> = {
  events: { icon: CalendarDays, color: "var(--brand-pink)" },
  forms: { icon: ClipboardList, color: "var(--brand-blue)" },
  media: { icon: Images, color: "#7c5cd6" },
  finance: { icon: Wallet, color: "var(--brand-green)" },
  team: { icon: Users, color: "#f08a24" },
  pages: { icon: PanelsTopLeft, color: "#1aa6a0" },
  accounts: { icon: ShieldCheck, color: "var(--brand-grey)" },
};

/** A head-only row count; null when the query fails (the card then shows no figure). */
async function count(query: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count: value, error } = await query;
  return error ? null : (value ?? 0);
}

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, { profile }] = await Promise.all([getTranslations({ locale, namespace: "admin" }), getSessionProfile()]);

  // Only the sections this account may open (the admin layout already guarantees an active profile).
  const cards = [
    { key: "events", href: "/admin/events", text: t("manageEvents"), show: can(profile, "events") },
    { key: "forms", href: "/admin/forms", text: t("manageForms"), show: can(profile, "forms") },
    { key: "media", href: "/admin/media", text: t("manageMedia"), show: can(profile, "media") },
    { key: "finance", href: "/admin/finance", text: t("manageFinance"), show: can(profile, "finance") },
    { key: "team", href: "/admin/team", text: t("manageTeam"), show: isAdmin(profile) },
    { key: "pages", href: "/admin/pages", text: t("managePages"), show: isAdmin(profile) },
    { key: "accounts", href: "/admin/accounts", text: t("manageAccounts"), show: can(profile, "accounts") },
  ] as const;
  const visible = cards.filter((c) => c.show);
  const shows = (key: CardKey) => visible.some((c) => c.key === key);

  // A live figure on the cards that have one (RLS still limits what each account can count).
  const supabase = await createClient();
  const [upcoming, fresh, pending] = await Promise.all([
    shows("events")
      ? count(
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("status", "published")
            .gte("starts_at", new Date().toISOString()),
        )
      : null,
    shows("forms") ? count(supabase.from("responses").select("id", { count: "exact", head: true }).eq("status", "new")) : null,
    shows("accounts") ? count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending")) : null,
  ]);
  const stats: Partial<Record<CardKey, { text: string; hot: boolean }>> = {
    ...(upcoming !== null && { events: { text: t("stats.upcoming", { count: upcoming }), hot: false } }),
    ...(fresh !== null && { forms: { text: t("stats.newResponses", { count: fresh }), hot: fresh > 0 } }),
    ...(pending !== null && { accounts: { text: t("stats.pending", { count: pending }), hot: pending > 0 } }),
  };

  const firstName = (profile?.full_name || profile?.email.replace(/@.*/, "") || "").split(/\s+/)[0];
  const today = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="mx-auto max-w-6xl">
      <section className="bg-hero relative overflow-hidden rounded-card px-5 py-7 text-white shadow-soft sm:px-8 sm:py-10">
        <div aria-hidden className="dots absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60 first-letter:uppercase">{today}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {firstName ? t("hello", { name: firstName }) : t("welcome")} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-2 max-w-xl text-white/75">{t("heroText")}</p>
          </div>
          <a
            href={`/${locale}`}
            target="_blank"
            rel="noreferrer"
            className="glass inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full px-4 py-2.5 text-sm font-bold transition hover:bg-white/15 sm:self-auto"
          >
            {t("viewSite")}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </section>

      {visible.length === 0 ? (
        <div data-tour="dashboard.no-access" className="mt-6 max-w-lg rounded-card border border-dashed border-border bg-white p-6">
          <h2 className="font-extrabold text-grey">{t("noAccessTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("noAccessText")}</p>
        </div>
      ) : (
        <>
          <h2 className="mt-8 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{t("sectionsTitle")}</h2>
          <div data-tour="dashboard.cards" className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {visible.map((c) => {
              const { icon: Icon, color } = LOOK[c.key];
              const stat = stats[c.key];
              return (
                <Link
                  key={c.key}
                  href={c.href}
                  style={{ "--c": color } as React.CSSProperties}
                  className="group relative flex items-start gap-4 overflow-hidden rounded-card border border-border bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--c)_45%,white)] hover:shadow-soft focus-visible:outline-2 focus-visible:outline-blue sm:flex-col sm:p-5"
                >
                  <span
                    aria-hidden
                    className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                    style={{ background: `color-mix(in srgb, ${color} 22%, transparent)` }}
                  />
                  <span
                    className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[var(--c)] transition group-hover:scale-105"
                    style={{ background: `color-mix(in srgb, ${color} 12%, white)` }}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-lg font-extrabold text-ink">{t(c.key)}</span>
                      <ArrowUpRight
                        className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--c)]"
                        aria-hidden
                      />
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{c.text}</span>
                    {stat && (
                      <span
                        className={
                          stat.hot
                            ? "mt-3 inline-flex items-center gap-1.5 rounded-full bg-pink/10 px-2.5 py-1 text-xs font-bold text-pink"
                            : "mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-grey"
                        }
                      >
                        {stat.hot && <span aria-hidden className="pulse-dot h-1.5 w-1.5 rounded-full bg-pink" />}
                        {stat.text}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
