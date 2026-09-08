import type { Language } from "./translations";

/**
 * URL locale model.
 *
 * Persian (`fa`) is the PRIMARY language and is canonical without a prefix:
 *
 *   /about          → Persian
 *   /en/about       → English
 *
 * The URL is the authoritative source of the current language. The
 * `henge-lang` cookie / localStorage only remember the user's last
 * preference and never override an explicit URL.
 */
export type Locale = Language;

export const locales: Locale[] = ["fa", "en"];

/** Persian is the primary/default locale — it never appears in the URL. */
export const defaultLocale: Locale = "fa";

/** The single valid explicit URL locale prefix. */
export const prefixedLocales: Locale[] = ["en"];

export function isLocale(value: string): value is Locale {
  return value === "fa" || value === "en";
}

/**
 * Remove a locale prefix from a browser pathname.
 * "/en/about" → "/about", "/en" → "/", "/about" → "/about" (unchanged).
 */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3);
  return pathname;
}

/** The pathname with any locale prefix removed (canonical Persian form). */
export function toCanonicalPath(pathname: string): string {
  return stripLocalePrefix(pathname);
}

/**
 * Build the URL for `path` in the given locale.
 *
 *   getLocalizedPath("/about", "fa")  // "/about"
 *   getLocalizedPath("/about", "en")  // "/en/about"
 *   getLocalizedPath("/", "en")       // "/en"
 *
 * An existing "/en" prefix is normalized away first, so the function is
 * idempotent: getLocalizedPath("/en/about", "en") === "/en/about".
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  const canonical = stripLocalePrefix(path) || "/";
  if (locale === defaultLocale) return canonical;
  return canonical === "/" ? "/en" : `/en${canonical}`;
}
