import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ConfirmProvider } from "@/components/ui/confirm";
import { TourProvider } from "@/components/admin/tour/tour-provider";
import { AdminNav, type AdminNavItem } from "./admin-nav";
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

  const items: AdminNavItem[] = [
    { key: "dashboard", href: "/admin", label: t("admin.dashboard") },
    ...(can(profile, "events") ? [{ key: "events", href: "/admin/events", label: t("admin.events") } as const] : []),
    ...(can(profile, "forms") ? [{ key: "forms", href: "/admin/forms", label: t("admin.forms") } as const] : []),
    ...(can(profile, "media") ? [{ key: "media", href: "/admin/media", label: t("admin.media") } as const] : []),
    ...(can(profile, "finance") ? [{ key: "finance", href: "/admin/finance", label: t("admin.finance") } as const] : []),
    ...(isAdmin(profile) ? [{ key: "team", href: "/admin/team", label: t("admin.team") } as const] : []),
    ...(isAdmin(profile) ? [{ key: "pages", href: "/admin/pages", label: t("admin.pages") } as const] : []),
    ...(can(profile, "accounts") ? [{ key: "accounts", href: "/admin/accounts", label: t("admin.accounts") } as const] : []),
  ];

  return (
    <ConfirmProvider>
    <div className="admin-ui flex min-h-screen flex-col bg-muted md:flex-row">
      <AdminNav
        items={items}
        locale={locale}
        viewer={{
          name: profile.full_name || profile.email,
          email: profile.email,
          role: profile.role === "admin" ? t("admin.roleAdmin") : t("admin.roleMember"),
          department: profile.department ? t(`adminAccounts.departments.${profile.department}`) : null,
        }}
        labels={{
          logout: t("nav.logout"),
          menu: t("admin.menu"),
          close: t("admin.closeMenu"),
          viewSite: t("admin.viewSite"),
          space: t("nav.login"),
        }}
      />
      <main className="admin-main min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-8">{children}</main>
      <Toaster position="top-center" richColors />
      <TourProvider
        viewer={{ admin: isAdmin(profile), sections: profile.sections ?? [] }}
        seen={profile.tours_seen ?? {}}
      />
    </div>
    </ConfirmProvider>
  );
}
