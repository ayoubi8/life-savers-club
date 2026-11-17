import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ConfirmProvider } from "@/components/ui/confirm";
import { LinkPending } from "@/components/ui/link-pending";
import { SignOutButton } from "./sign-out-button";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, { userId, profile }] = await Promise.all([
    getTranslations({ locale }),
    getSessionProfile(),
  ]);
  if (!userId) return redirect({ href: "/login", locale });
  if (!profile) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return redirect({ href: "/login", locale });
  }

  // Pending or disabled accounts see a notice instead of the admin area.
  if (profile.status !== "active") {
    const key = profile.status === "disabled" ? "disabled" : "pending";
    return (
      <main className="grid min-h-screen place-items-center bg-muted px-4">
        <div className="w-full max-w-md rounded-card border border-border bg-white p-8 text-center shadow-sm">
          <Image src="/brand/logo.png" alt="Life Savers" width={120} height={100} className="mx-auto" />
          <h1 className="mt-4 text-xl font-extrabold text-blue">
            {key === "pending" ? t("pendingAccount.title") : t("pendingAccount.disabledTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {key === "pending" ? t("pendingAccount.text") : t("pendingAccount.disabledText")}
          </p>
          <p className="mt-3 text-xs text-grey">{profile.email}</p>
          <div className="mt-6 flex justify-center">
            <SignOutButton locale={locale} label={t("nav.logout")} />
          </div>
        </div>
      </main>
    );
  }

  const items = [
    { href: "/admin", label: t("admin.dashboard") },
    ...(can(profile, "events") ? [{ href: "/admin/events", label: t("admin.events") }] : []),
    ...(can(profile, "forms") ? [{ href: "/admin/forms", label: t("admin.forms") }] : []),
    ...(can(profile, "media") ? [{ href: "/admin/media", label: t("admin.media") }] : []),
    ...(can(profile, "finance") ? [{ href: "/admin/finance", label: t("admin.finance") }] : []),
    ...(isAdmin(profile) ? [{ href: "/admin/team", label: t("admin.team") }] : []),
    ...(isAdmin(profile) ? [{ href: "/admin/pages", label: t("admin.pages") }] : []),
    ...(can(profile, "accounts") ? [{ href: "/admin/accounts", label: t("admin.accounts") }] : []),
  ] as { href: "/admin" | "/admin/events" | "/admin/forms" | "/admin/media" | "/admin/finance" | "/admin/team" | "/admin/pages" | "/admin/accounts"; label: string }[];

  return (
    <ConfirmProvider>
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-3 bg-grey p-4 text-white md:w-60 md:p-5">
        <div className="flex items-center justify-between md:block">
          <Link href="/">
            <Image src="/brand/logo.png" alt="Life Savers" width={96} height={80} className="h-14 w-auto rounded-full bg-white md:mb-6 md:h-auto" />
          </Link>
          <div className="md:hidden"><SignOutButton locale={locale} label={t("nav.logout")} /></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="relative overflow-hidden whitespace-nowrap rounded-lg px-3 py-2 font-semibold hover:bg-white/10">
              {i.label}
              <LinkPending />
            </Link>
          ))}
        </nav>
        <p className="hidden truncate text-xs text-white/70 md:block">{profile.email} · {profile.role === "admin" ? t("admin.roleAdmin") : t("admin.roleMember")}
          {profile.department && ` · ${t(`adminAccounts.departments.${profile.department}`)}`}
        </p>
        <div className="hidden md:block"><SignOutButton locale={locale} label={t("nav.logout")} /></div>
      </aside>
      <main className="min-w-0 flex-1 bg-muted p-4 sm:p-6">{children}</main>
      <Toaster position="top-center" richColors />
    </div>
    </ConfirmProvider>
  );
}
