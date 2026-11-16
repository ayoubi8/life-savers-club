import { redirect } from "next/navigation";

/** The bare department URL opens the Détails tab. */
export default async function DepartmentIndex({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect(`/${locale}/admin/team/${id}/details`);
}
