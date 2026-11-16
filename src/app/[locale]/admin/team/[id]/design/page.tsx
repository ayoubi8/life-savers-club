import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getDepartmentForAdmin } from "@/lib/team/queries";
import { DesignPanel } from "./design-panel";

export default async function DepartmentDesignPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const department = await getDepartmentForAdmin(id);
  if (!department) notFound();
  return <DesignPanel key={department.updated_at} department={department} locale={locale} />;
}
