import type { Locale } from "@/lib/i18n/routing";

/**
 * Central site/SEO configuration.
 *
 * The official public brand is HOME FORM. "Ako Lighting" was a previous
 * internal project name and must not be used as the public brand.
 *
 * The production base URL comes from NEXT_PUBLIC_SITE_URL. Never hardcode a
 * domain in pages — canonical/OG/sitemap URLs all resolve through here.
 * Falls back to localhost for development/preview builds.
 */
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteUrl: string = rawSiteUrl.replace(/\/+$/, "");

/** Metadata/structured-data brand name. */
export const siteName = "Home Form";

/** Persian is the primary locale — canonical Persian URLs are unprefixed. */
export const defaultLocale: Locale = "fa";

/** Locales exposed to search engines (order conveys priority). */
export const supportedLocales: Locale[] = ["fa", "en"];

/** hreflang region tags, matched to the URL architecture. */
export const hreflangTags = {
  "fa-IR": "fa",
  "en-US": "en",
} as const;

export const defaultOgType = "website";
