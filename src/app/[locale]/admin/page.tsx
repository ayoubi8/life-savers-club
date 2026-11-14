import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-blue">{t("dashboard")}</h1>
      <p className="mt-2 text-muted-foreground">{t("welcome")} 👋</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {(["forms", "events", "team"] as const).map((k) =>
          k === "forms" ? (
            <Link
              key={k}
              href="/admin/forms"
              className="rounded-card border border-border bg-white p-5 transition hover:border-blue"
            >
              <h2 className="font-bold text-grey">{t(k)}</h2>
              <p className="text-sm text-muted-foreground">{t("manageForms")}</p>
            </Link>
          ) : (
            <div key={k} className="rounded-card border border-border bg-white p-5">
              <h2 className="font-bold text-grey">{t(k)}</h2>
              <p className="text-sm text-muted-foreground">{t("soon")}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
