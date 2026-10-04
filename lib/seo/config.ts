import { defaultLocale, locales, type Locale } from "@/lib/i18n/routing";

/**
 * Central site/SEO configuration.
 *
 * The official public brand is HOME FORM. "Ako Lighting" was a previous
 * internal project name and must not be used as the public brand.
 *
 * The production base URL comes from NEXT_PUBLIC_SITE_URL. Never hardcode a
 * domain in pages — canonical/OG/sitemap URLs all resolve through here.
 * Falls back to localhost for development/preview builds.
 *
 * A bare domain (`ako-light.vercel.app`, with no scheme) is accepted and
 * treated as https so a missing scheme can never throw `ERR_INVALID_URL`
 * during prerendering.
 */
function normalizeSiteUrl(raw: string | undefined): string {
  const value =
    raw?.trim().replace(/\/+$/, "") || "http://localhost:3000";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteUrl: string = normalizeSiteUrl(rawSiteUrl);

/** Metadata/structured-data brand name. */
export const siteName = "Home Form";

/**
 * Re-exported, NOT redefined. `lib/i18n/routing.ts` owns the locale model;
 * a second `defaultLocale = "fa"` used to live here and was a genuine second
 * source of truth for the exact thing this pass inverts.
 */
export { defaultLocale };

/** Locales exposed to search engines (order conveys priority). */
export const supportedLocales: Locale[] = locales;

/** hreflang region tags, matched to the URL architecture. */
export const hreflangTags = {
  "fa-IR": "fa",
  "en-US": "en",
} as const;

export const defaultOgType = "website";
