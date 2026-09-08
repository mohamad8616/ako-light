import { NextResponse, type NextRequest } from "next/server";

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
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Explicit English tree — pass through untouched.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return NextResponse.next();
  }

  // Legacy /fa prefix is not canonical (Persian is unprefixed).
  // Redirect /fa → / and /fa/<path> → /<path>.
  if (pathname === "/fa" || pathname.startsWith("/fa/")) {
    const target = pathname === "/fa" ? "/" : pathname.slice(3);
    return NextResponse.redirect(
      new URL(`${target}${search}`, request.url),
      308,
    );
  }

  // Every other page path is Persian. Rewrite internally so the browser URL
  // stays unprefixed while app/[locale=fa]/ renders the page.
  const internalPath = pathname === "/" ? "" : pathname;
  return NextResponse.rewrite(
    new URL(`/fa${internalPath}${search}`, request.url),
  );
}

export const config = {
  // Skip Next internals, route handlers and anything that looks like a
  // static file (public/ assets, images, fonts, etc.).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
