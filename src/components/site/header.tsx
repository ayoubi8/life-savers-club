import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getSiteGeneral } from "@/lib/site-content/queries";
import { tx } from "@/lib/site-content/schema";
import { Nav } from "./nav";

export async function Header({ locale }: { locale: string }) {
  const { nav, logo, nameStart, nameEnd } = await getSiteGeneral();
  const items = [
    { href: "/", label: tx(nav.home, locale) },
    { href: "/events", label: tx(nav.events, locale) },
    { href: "/team", label: tx(nav.team, locale) },
    { href: "/sponsors", label: tx(nav.sponsors, locale) },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" locale={locale} className="flex items-center gap-2.5" aria-label={`${nameStart} ${nameEnd}`.trim()}>
          <Image src={logo.url} alt="" width={44} height={36} className="h-9 w-auto" priority />
          <span className="text-lg font-extrabold tracking-tight text-ink">
            {nameStart} <span className="text-pink">{nameEnd}</span>
          </span>
        </Link>
        <Nav items={items} joinLabel={tx(nav.join, locale)} locale={locale} />
      </div>
    </header>
  );
}
