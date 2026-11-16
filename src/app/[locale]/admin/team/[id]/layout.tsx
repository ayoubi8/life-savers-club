import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isUuid } from "@/lib/forms/schema";
import { getDepartmentForAdmin } from "@/lib/team/queries";
import { DepartmentHeader } from "./department-header";

export default async function DepartmentAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!isUuid(id)) notFound();
  const department = await getDepartmentForAdmin(id);
  if (!department) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <DepartmentHeader
        locale={locale}
        department={{ id: department.id, slug: department.slug, name: department.name_fr, status: department.status }}
      />
      <div className="py-6">{children}</div>
    </div>
  );
}
