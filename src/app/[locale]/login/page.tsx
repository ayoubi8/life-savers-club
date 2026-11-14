import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "login" });

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-white p-8 shadow-sm">
        <Image src="/brand/logo.png" alt="Life Savers" width={140} height={116} className="mx-auto" priority />
        <h1 className="mt-4 text-center text-2xl font-extrabold text-blue">{t("title")}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">{t("subtitle")}</p>
        <LoginForm locale={locale} />
      </div>
    </main>
  );
}
