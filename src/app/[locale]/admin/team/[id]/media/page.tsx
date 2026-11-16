import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getDepartmentForAdmin } from "@/lib/team/queries";
import { MediaPanel } from "./media-panel";

export default async function DepartmentMediaPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const department = await getDepartmentForAdmin(id);
  if (!department) notFound();
  return <MediaPanel key={department.updated_at} department={department} />;
}
