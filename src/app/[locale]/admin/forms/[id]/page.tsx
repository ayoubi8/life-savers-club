import { redirect } from "next/navigation";

// Legacy URLs (?tab=...) and the bare form URL land on the right route.
const LEGACY: Record<string, string> = {
  editor: "edit",
  submissions: "results",
  share: "share",
  integrations: "integrations",
  settings: "settings",
};

export default async function FormIndex({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  const tab = typeof query.tab === "string" ? query.tab : "editor";
  const rest = new URLSearchParams();
  for (const key of ["connected", "error"]) {
    const value = query[key];
    if (typeof value === "string") rest.set(key, value);
  }
  const suffix = rest.size > 0 ? `?${rest}` : "";
  redirect(`/${locale}/admin/forms/${id}/${LEGACY[tab] ?? "edit"}${suffix}`);
}
