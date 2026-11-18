"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Images,
  LayoutDashboard,
  Menu,
  PanelsTopLeft,
  ShieldCheck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LinkPending } from "@/components/ui/link-pending";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./sign-out-button";

export type AdminNavKey = "dashboard" | "events" | "forms" | "media" | "finance" | "team" | "pages" | "accounts";
export type AdminNavItem = {
  key: AdminNavKey;
  href: "/admin" | "/admin/events" | "/admin/forms" | "/admin/media" | "/admin/finance" | "/admin/team" | "/admin/pages" | "/admin/accounts";
  label: string;
};
type Viewer = { name: string; email: string; role: string; department: string | null };
type Labels = { logout: string; menu: string; close: string; viewSite: string; space: string };

const ICONS: Record<AdminNavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  events: CalendarDays,
  forms: ClipboardList,
  media: Images,
  finance: Wallet,
  team: Users,
  pages: PanelsTopLeft,
  accounts: ShieldCheck,
};

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-brand-gradient font-extrabold text-white", className)}>
      {initials(name)}
    </span>
  );
}

function Brand({ space }: { space: string }) {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-white">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white p-0.5 shadow-glow">
        <Image src="/brand/logo.png" alt="Life Savers" width={44} height={44} className="h-full w-full object-contain" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block font-extrabold tracking-tight">Life Savers</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">{space}</span>
      </span>
    </Link>
  );
}

/** Sidebar body: brand, sections, account card. Shared by the desktop sidebar and the phone drawer. */
function Panel({
  items,
  viewer,
  labels,
  locale,
  pathname,
  tour,
  onNavigate,
}: {
  items: AdminNavItem[];
  viewer: Viewer;
  labels: Labels;
  locale: string;
  pathname: string;
  tour: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-1 pt-1">
        <Brand space={labels.space} />
      </div>

      <nav data-tour={tour ? "admin.nav" : undefined} aria-label={labels.menu} className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-[15px] font-semibold transition",
                active ? "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              {active && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-pink" />}
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition",
                  active ? "bg-pink text-white" : "bg-white/[0.06] text-white/70 group-hover:text-white",
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="truncate">{item.label}</span>
              <LinkPending />
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        <a
          href={`/${locale}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white"
        >
          {labels.viewSite}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <div data-tour={tour ? "admin.account" : undefined} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
          <div className="flex items-center gap-3">
            <Avatar name={viewer.name} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{viewer.name}</p>
              <p className="truncate text-xs text-white/55">{viewer.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white/80">
              {viewer.role}
              {viewer.department && ` · ${viewer.department}`}
            </span>
            <SignOutButton locale={locale} label={labels.logout} variant="ghost" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Admin navigation: a fixed sidebar from `md` up; on phones a sticky top bar whose
 * menu button opens the same panel as a drawer.
 */
export function AdminNav({ items, viewer, labels, locale }: { items: AdminNavItem[]; viewer: Viewer; labels: Labels; locale: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = items.find((item) => isActive(pathname, item.href)) ?? items[0];

  // Drawer: Escape closes it and the page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="admin-sidebar sticky top-0 hidden h-screen w-60 shrink-0 text-white md:block">
        <Panel items={items} viewer={viewer} labels={labels} locale={locale} pathname={pathname} tour />
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-white/90 px-3 backdrop-blur md:hidden">
        <button
          type="button"
          data-tour="admin.nav"
          onClick={() => setOpen(true)}
          aria-label={labels.menu}
          aria-expanded={open}
          className="grid h-10 w-10 place-items-center rounded-xl text-grey hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin" className="shrink-0" aria-label="Life Savers">
          <Image src="/brand/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-full object-contain" />
        </Link>
        <p className="min-w-0 flex-1 truncate font-extrabold text-ink">{current?.label}</p>
        <button
          type="button"
          data-tour="admin.account"
          onClick={() => setOpen(true)}
          aria-label={viewer.name}
          className="rounded-full focus-visible:outline-2 focus-visible:outline-blue"
        >
          <Avatar name={viewer.name} className="h-9 w-9 text-xs" />
        </button>
      </header>

      {/* Phone drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={labels.menu}>
          <button type="button" aria-label={labels.close} onClick={() => setOpen(false)} className="admin-fade absolute inset-0 bg-ink/50 backdrop-blur-[2px]" />
          <div className="admin-sidebar admin-slide absolute inset-y-0 left-0 w-[min(20rem,86vw)] text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={labels.close}
              className="absolute right-3 top-4 z-10 grid h-10 w-10 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <Panel items={items} viewer={viewer} labels={labels} locale={locale} pathname={pathname} tour={false} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
