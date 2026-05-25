import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";

const handleI18n = createIntlMiddleware(routing);

const DASHBOARD_PATHS = [
  "/dashboard",
  "/agenda",
  "/team",
  "/branches",
  "/services",
  "/settings",
  "/links",
  "/setup",
];
const AUTH_PATHS = ["/login", "/signup"];

// First path segment values that are owned by the app.
// Anything else is treated as a business slug (public booking route).
// /api/booking/** is excluded from the middleware matcher entirely.
const SYSTEM_SEGMENTS = new Set([
  "dashboard",
  "agenda",
  "team",
  "branches",
  "services",
  "settings",
  "links",
  "setup",
  "login",
  "signup",
  "callback",
  "api-docs",
]);

function isPublicBookingPath(bare: string): boolean {
  const segments = bare.split("/").filter(Boolean);
  if (segments.length < 1 || segments.length > 3) return false;
  return !SYSTEM_SEGMENTS.has(segments[0] ?? "");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix to get the bare path for route-type checks
  const bare = pathname.replace(/^\/(es|en)/, "") || "/";
  const isDashboard = DASHBOARD_PATHS.some(
    (p) => bare === p || bare.startsWith(p + "/")
  );
  const isAuthPage = AUTH_PATHS.some(
    (p) => bare === p || bare.startsWith(p + "/")
  );

  // Refresh the Supabase session on every request
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locale =
    pathname.match(/^\/(es|en)/)?.[1] ?? routing.defaultLocale;

  // Public booking routes: /:bizSlug, /:bizSlug/:branchSlug, /:bizSlug/:branchSlug/:staffSlug
  // Always pass through — no auth check, no redirect.
  if (isPublicBookingPath(bare)) {
    const intlResponse = handleI18n(request);
    supabaseResponse.cookies.getAll().forEach((c) => intlResponse.cookies.set(c));
    return intlResponse;
  }

  // Unauthenticated → redirect to login
  if (isDashboard && !user) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  }

  // Authenticated → redirect away from auth pages
  if (isAuthPage && user) {
    const res = NextResponse.redirect(
      new URL(`/${locale}/dashboard`, request.url)
    );
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  }

  // Apply intl (locale prefix redirects, etc.) and carry session cookies
  const intlResponse = handleI18n(request);
  supabaseResponse.cookies.getAll().forEach((c) => intlResponse.cookies.set(c));
  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)" ],
};
