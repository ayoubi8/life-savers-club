import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Nav } from "./nav";

export async function Header({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const items = [
    { href: "/", label: t("home") },
    { href: "/events", label: t("events") },
    { href: "/team", label: t("team") },
    { href: "/sponsors", label: t("sponsors") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" locale={locale} className="flex items-center gap-2.5">
          <Image src="/brand/logo.png" alt="" width={44} height={36} className="h-9 w-auto" priority />
          <span className="text-lg font-extrabold tracking-tight text-ink">
            Life <span className="text-pink">Savers</span>
          </span>
        </Link>
        <Nav items={items} joinLabel={t("join")} locale={locale} />
      </div>
    </header>
  );
}
