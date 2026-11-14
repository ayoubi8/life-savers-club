"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

type Item = { href: string; label: string };

export function Nav({ items, joinLabel, locale }: { items: Item[]; joinLabel: string; locale: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const other = locale === "fr" ? "en" : "fr";

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              active(i.href) ? "bg-blue/10 text-blue" : "text-grey hover:bg-muted hover:text-blue"
            }`}
          >
            {i.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link href={pathname} locale={other} className="rounded-full border border-border px-3 py-2 text-xs font-extrabold uppercase text-grey hover:bg-muted">
          {other}
        </Link>
        <Link href="/join-us" className="btn btn-pink hidden !px-5 !py-2 text-sm sm:inline-flex">
          {joinLabel}
        </Link>
        <button
          className="grid h-11 w-11 place-items-center rounded-full text-grey hover:bg-muted lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-x-0 top-16 z-40 h-[calc(100dvh-4rem)] overflow-y-auto bg-white p-5 lg:hidden">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className={`rounded-2xl px-5 py-4 text-lg font-extrabold ${active(i.href) ? "bg-blue/10 text-blue" : "text-grey"}`}
              >
                {i.label}
              </Link>
            ))}
            <Link href="/join-us" onClick={() => setOpen(false)} className="btn btn-pink mt-3">
              {joinLabel}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
