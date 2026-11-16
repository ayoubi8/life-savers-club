import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

/** The team (bureau + departments) is edited by active admins only, like the site pages. */
export default async function TeamSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { profile } = await getSessionProfile();
  if (!isAdmin(profile)) return redirect({ href: "/admin", locale });
  return children;
}
