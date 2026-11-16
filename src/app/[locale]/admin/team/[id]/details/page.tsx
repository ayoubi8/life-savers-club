import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getDepartmentForAdmin } from "@/lib/team/queries";
import { DetailsForm } from "./details-form";

export default async function DepartmentDetailsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const department = await getDepartmentForAdmin(id);
  if (!department) notFound();
  return <DetailsForm key={department.updated_at} department={department} locale={locale} />;
}
