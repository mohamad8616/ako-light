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
 *   /about          → English (canonical, unprefixed — rewritten internally
 *                     to /en/about so app/[locale=en]/about renders)
 *   /fa/about       → Persian (matches app/[locale=fa]/about directly)
 *   /en/about       → 308 redirect to /about (/en is NOT canonical)
 *
 * The URL always wins over the henge-lang cookie/localStorage: unprefixed
 * paths are ALWAYS English and /fa paths are ALWAYS Persian, regardless of
 * any stored preference. No Accept-Language detection — deterministic URLs,
 * so `/` is English for every visitor and the canonical URL cannot flip.
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
  // Canonical Persian tree — pass through untouched.
  if (pathname === "/fa" || pathname.startsWith("/fa/")) {
    return { type: "pass" };
  }

  // Legacy /en prefix is not canonical (English is unprefixed).
  // Redirect /en → / and /en/<path> → /<path>.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return {
      type: "redirect",
      target: pathname === "/en" ? "/" : pathname.slice(3),
    };
  }

  // Every other page path is English. Rewrite internally so the browser URL
  // stays unprefixed while app/[locale=en]/ renders the page.
  const internalPath = pathname === "/" ? "" : pathname;
  return { type: "rewrite", target: `/en${internalPath}` };
}

/**
 * The canonical Persian prefix of a request path, or "" for English.
 *
 * Used to keep the admin gate's redirects in the language the visitor was
 * already browsing: a Persian admin hitting `/fa/admin` must land on
 * `/fa/sign-in`, not the English one. Mirrors the proxy's own pass/redirect
 * rule above — only `/fa` is a live prefix.
 */
function localePrefixOf(pathname: string): string {
  return pathname === "/fa" || pathname.startsWith("/fa/") ? "/fa" : "";
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
    const prefix = localePrefixOf(pathname);

    // ── WHY THIS IS WRAPPED ─────────────────────────────────────────────────
    //
    // `auth.api.getSession()` reaches the DATABASE. When that call fails — the
    // log this fixes showed `ERROR [Better Auth]: INTERNAL_SERVER_ERROR Error:
    // Connection terminated unexpectedly` followed by `APIError: Failed to get
    // session` — the middleware THREW. A thrown middleware aborts the request
    // BEFORE the locale rewrite below runs, so `/admin/homepage` was never
    // rewritten to `/en/admin/homepage`, matched no route, and the browser got
    // a 404 after the DB call had hung for minutes.
    //
    // That is a misdiagnosis generator: a transient database blip looked
    // exactly like a missing page. It also did NOT reproduce on Liara, where the
    // database connection is healthy — same code, different infrastructure,
    // which is why this looked environment-specific for so long.
    //
    // An infrastructure failure is not an authorization decision, so the
    // middleware no longer propagates it. It FAILS CLOSED: a caller whose
    // session could not be verified is sent to the sign-in page, exactly like a
    // signed-out visitor. Nothing is exposed by that choice — the page-level
    // gate (`requireAdminAccess()` in app/[locale]/(admin)/layout.tsx) verifies
    // the session again and is the real authority — and the failure mode
    // becomes a redirect the operator can understand instead of a phantom 404.
    let session: Awaited<
      ReturnType<typeof import("@/lib/auth/auth").auth.api.getSession>
    > = null;

    try {
      const { auth } = await import("@/lib/auth/auth");
      session = await auth.api.getSession({ headers: request.headers });
    } catch (error) {
      console.error(
        "[proxy] session lookup failed — failing closed to sign-in:",
        error instanceof Error ? error.message : error,
      );
      console.log(error);
    }

    if (!session) {
      const redirectUrl = new URL(`${prefix}/sign-in`, request.url);
      redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);
      return NextResponse.redirect(redirectUrl, 307);
    }

    // Role gate: a signed-in user without an admin-level role (plain `user`)
    // is bounced to the homepage with an access-denied message. This is
    // the fast edge check; the React-tree backstop lives in
    // lib/admin/access.ts (requireAdminAccess / requireOwnerAccess).
    const role = session.user?.role;
    const isAdminRole =
      typeof role === "string" &&
      ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);

    if (!isAdminRole) {
      return NextResponse.redirect(new URL(prefix || "/", request.url), 307);
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
