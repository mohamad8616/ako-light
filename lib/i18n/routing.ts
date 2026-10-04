import type { Language } from "./translations";

/**
 * URL locale model — THE single source of truth for locale routing.
 *
 * English (`en`) is the PRIMARY language and is canonical without a prefix:
 *
 *   /about          → English
 *   /fa/about       → Persian
 *
 * `/en/...` is a LEGACY prefix: it is no longer canonical and `proxy.ts`
 * 308-redirects it to the equivalent unprefixed URL, so a canonical English
 * URL never carries a prefix. `/fa/...` IS canonical — Persian is only
 * reachable through it.
 *
 * The URL is the authoritative source of the current language. The
 * `henge-lang` cookie / localStorage only remember the user's last
 * preference and never override an explicit URL, and there is no
 * Accept-Language detection: `/` is always English regardless of what the
 * browser asks for, so the canonical URL cannot flip per visitor.
 *
 * Changing `defaultLocale` here flips the whole architecture — `getLocalizedPath`,
 * the proxy's rewrite/redirect decision, the sitemap, canonicals and hreflang
 * all derive from it. Nothing else may hardcode which locale is default.
 */
export type Locale = Language;

/** Both supported locales, default first. */
export const locales: Locale[] = ["en", "fa"];

/** English is the primary/default locale — it never appears in the URL. */
export const defaultLocale: Locale = "en";

/** The locales that keep an explicit URL prefix (everything but the default). */
export const prefixedLocales: Locale[] = ["fa"];

export function isLocale(value: string): value is Locale {
  return value === "fa" || value === "en";
}

/**
 * Remove a locale prefix from a browser pathname.
 *
 *   "/fa/about" → "/about"      (canonical Persian prefix)
 *   "/en/about" → "/about"      (legacy English prefix, pre-redirect)
 *   "/about"    → "/about"      (unprefixed = English, unchanged)
 *   "/en"       → "/"
 *   "/fa"       → "/"
 *
 * Both known prefixes are stripped, so callers that compare a live pathname
 * against a locale-neutral route (the newsletter wrapper, the admin sidebar's
 * active state, Row's path key) behave identically under either language
 * without knowing which one is currently default.
 */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en" || pathname === "/fa") return "/";
  if (pathname.startsWith("/en/") || pathname.startsWith("/fa/")) {
    return pathname.slice(3);
  }
  return pathname;
}

/** The pathname with any locale prefix removed (canonical, locale-neutral form). */
export function toCanonicalPath(pathname: string): string {
  return stripLocalePrefix(pathname);
}

/**
 * Build the browser-visible URL for `path` in the given locale.
 *
 *   getLocalizedPath("/about", "en")  // "/about"      (default → no prefix)
 *   getLocalizedPath("/", "en")       // "/"
 *   getLocalizedPath("/about", "fa")  // "/fa/about"
 *   getLocalizedPath("/", "fa")       // "/fa"
 *
 * The rule is `default locale => no prefix, other locale => prefix`, derived
 * from `defaultLocale` rather than hardcoding "fa", so flipping the default
 * again would not require touching this function.
 *
 * An existing locale prefix is normalized away first, so the function is
 * idempotent: getLocalizedPath("/fa/about", "fa") === "/fa/about", and
 * getLocalizedPath("/en/about", "en") === "/about" (the legacy /en form
 * normalizes to the canonical unprefixed one).
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  const canonical = stripLocalePrefix(path) || "/";
  if (locale === defaultLocale) return canonical;
  return canonical === "/" ? `/${locale}` : `/${locale}${canonical}`;
}
