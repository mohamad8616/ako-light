import type { Locale } from "@/lib/i18n/routing";

/**
 * Central site/SEO configuration.
 *
 * The production base URL comes from NEXT_PUBLIC_SITE_URL. Never hardcode a
 * domain in pages — canonical/OG/sitemap URLs all resolve through here.
 * Falls back to localhost for development/preview builds.
 */
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteUrl: string = rawSiteUrl.replace(/\/+$/, "");

/** Metadata brand name (Persian pages use it as-is: "… | Ako Lighting"). */
export const siteName = "Ako Lighting";

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
