import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSessionProfile } from "@/lib/auth";
import { can } from "@/lib/permissions";

/** Only admins and members with the "forms" section get past this point. */
export default async function FormsSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { profile } = await getSessionProfile();
  if (!can(profile, "forms")) return redirect({ href: "/admin", locale });
  return children;
}
