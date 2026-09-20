import { ADMIN_ROLES } from "@/lib/auth/permissions";
import { NextResponse, type NextRequest } from "next/server";

const LOCALE_PREFIX = /^\/(en|fa)(?=\/|$)/;

function stripLocalePrefix(pathname: string) {
  return pathname.replace(LOCALE_PREFIX, "") || "/";
}

export function isAdminPath(pathname: string): boolean {
  const normalized = stripLocalePrefix(pathname).replace(/\/+$/, "");
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

/**
 * Locale URL architecture (see lib/i18n/routing.ts):
 *
 *   /about          → Persian (canonical, unprefixed — rewritten internally
 *                     to /fa/about so app/[locale=fa]/about renders)
 *   /en/about       → English (matches app/[locale=en]/about directly)
 *   /fa/about       → 308 redirect to /about (/fa is NOT canonical)
 *
 * The URL always wins over the henge-lang cookie/localStorage: unprefixed
 * paths are ALWAYS Persian and /en paths are ALWAYS English, regardless of
 * any stored preference. No Accept-Language detection — deterministic URLs.
 */

/** What the middleware should do with a request path. */
export type ProxyAction =
  | { type: "pass" }
  | { type: "redirect"; target: string }
  | { type: "rewrite"; target: string };

/**
 * Pure decision core of the locale middleware, extracted so it can be unit
 * tested without a NextRequest/NextResponse context (the E2E checkpoint
 * covers the wiring itself).
 */
export function resolveProxyAction(pathname: string): ProxyAction {
  // Explicit English tree — pass through untouched.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return { type: "pass" };
  }

  // Legacy /fa prefix is not canonical (Persian is unprefixed).
  // Redirect /fa → / and /fa/<path> → /<path>.
  if (pathname === "/fa" || pathname.startsWith("/fa/")) {
    return {
      type: "redirect",
      target: pathname === "/fa" ? "/" : pathname.slice(3),
    };
  }

  // Every other page path is Persian. Rewrite internally so the browser URL
  // stays unprefixed while app/[locale=fa]/ renders the page.
  const internalPath = pathname === "/" ? "" : pathname;
  return { type: "rewrite", target: `/fa${internalPath}` };
}

/**
 * Whether a request path must reach its handler without the session gate
 * (Better Auth API routes and the sign-in page stay public). Pure so the
 * auth checkpoint can unit test it; the matcher in {@link config} already
 * keeps `api` away from this middleware either way.
 */
export function shouldBypassAuth(pathAndQuery: string): boolean {
  const { pathname } = new URL(pathAndQuery, "http://localhost");
  const publicPath = stripLocalePrefix(pathname);

  return (
    pathname.startsWith("/api/") ||
    publicPath === "/sign-in" ||
    publicPath.startsWith("/sign-in/") ||
    publicPath === "/login" ||
    publicPath.startsWith("/login/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isAdminPath(pathname)) {
    const { auth } = await import("@/lib/auth/auth");
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      const redirectUrl = new URL("/sign-in", request.url);
      redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);
      return NextResponse.redirect(redirectUrl, 307);
    }

    // Role gate: a signed-in user without an admin-level role (plain `user`)
    // is bounced to the sign-in page with an access-denied message. This is
    // the fast edge check; the React-tree backstop lives in
    // lib/admin/access.ts (requireAdminAccess / requireOwnerAccess).
    const role = session.user?.role;
    const isAdminRole =
      typeof role === "string" &&
      ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);

    if (!isAdminRole) {
      const redirectUrl = new URL("/sign-in", request.url);
      redirectUrl.searchParams.set("denied", "1");
      redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);
      return NextResponse.redirect(redirectUrl, 307);
    }
  }

  const action = resolveProxyAction(pathname);

  if (action.type === "pass") {
    return NextResponse.next();
  }

  const target = new URL(`${action.target}${search}`, request.url);
  return action.type === "redirect"
    ? NextResponse.redirect(target, 308)
    : NextResponse.rewrite(target);
}

export const config = {
  // Skip Next internals, route handlers and anything that looks like a
  // static file (public/ assets, images, fonts, etc.).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
