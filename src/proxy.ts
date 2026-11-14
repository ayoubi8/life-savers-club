import createIntlProxy from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { hasAuthCookie, refreshSession } from "./lib/supabase/session";

const intlProxy = createIntlProxy(routing);

// Legacy `?tab=` values and the bare form URL go straight to a tab route,
// without rendering the form layout first.
const LEGACY_TABS: Record<string, string> = {
  editor: "edit",
  submissions: "results",
  share: "share",
  integrations: "integrations",
  settings: "settings",
};
const BARE_FORM = /^\/(fr|en)\/admin\/forms\/([0-9a-f-]{36})\/?$/i;

export async function proxy(request: NextRequest) {
  const response = intlProxy(request);

  // Anonymous visitors have no session to refresh: skip Supabase entirely.
  const userId = hasAuthCookie(request) ? await refreshSession(request, response) : null;

  const { pathname, searchParams } = request.nextUrl;
  const match = pathname.match(/^\/(fr|en)(\/admin(\/.*)?)?$/);
  const locale = match?.[1] ?? routing.defaultLocale;
  const isAdmin = pathname.includes("/admin");

  // Optimistic gate only. The admin layout re-checks the role on the server.
  if (isAdmin && !userId) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const bare = pathname.match(BARE_FORM);
  if (bare) {
    const tab = LEGACY_TABS[searchParams.get("tab") ?? ""] ?? "edit";
    const target = new URL(`/${bare[1]}/admin/forms/${bare[2]}/${tab}`, request.url);
    for (const key of ["connected", "error"]) {
      const value = searchParams.get(key);
      if (value !== null) target.searchParams.set(key, value);
    }
    const redirect = NextResponse.redirect(target);
    // Keep any refreshed auth cookies.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = {
  // `\\.` must stay double-escaped: a single `\.` becomes `.` in the string and the
  // pattern then excludes every path, so the proxy silently never runs.
  // `auth/` holds the OAuth callback, which lives outside `[locale]`.
  matcher: ["/((?!api|auth/|_next|_vercel|.*\\..*).*)"],
};
