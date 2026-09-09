import type { Metadata } from "next";
import {
  getLocalizedPath,
  isLocale,
  type Locale,
} from "@/lib/i18n/routing";
import { defaultOgType, hreflangTags, siteName } from "./config";
import type { JsonLdObject } from "./structuredData";

/**
 * Resolve a route locale param to a Locale. The [locale] route + proxy
 * already validate this; this is a safe guard for typing, not a second
 * source of truth.
 */
export function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : "fa";
}

/**
 * LocalizedMetadata carries an optional page-level JSON-LD payload. Next
 * renders `jsonLd` via the <JsonLdRenderer> server component (see below),
 * which emits the <script type="application/ld+json"> tags.
 */
export interface LocalizedMetadataInput {
  /** Raw route locale param. */
  locale: string;
  /**
   * Locale-neutral canonical path, e.g. "/about" or "/collections/ritual-gravity".
   * The per-locale URLs are derived with getLocalizedPath():
   *   fa → "/collections/ritual-gravity", en → "/en/collections/ritual-gravity".
   * Never pass a path that already contains "/en" or "/fa".
   */
  path: string;
  title: string;
  description: string;
  /** Optional OG/social image — must come from real project data. */
  image?: string;
  /**
   * Use when the title already carries the brand (e.g. the home page) and
   * must not receive the "%s | Home Form" template suffix.
   */
  absoluteTitle?: boolean;
  /** Internal interfaces (e.g. search) → noindex, follow. */
  noindex?: boolean;
  /** Optional Schema.org JSON-LD payload(s) rendered server-side. */
  jsonLd?: JsonLdObject[];
}

/**
 * Build page metadata with the correct canonical URL and hreflang
 * alternates for the active locale.
 *
 * Canonicals always use the browser-visible URLs from Pass 5's routing:
 * Persian pages canonicalize to their unprefixed URL, English pages to
 * their /en URL. "/fa/..." (the proxy's internal rewrite) never appears.
 */
export function buildLocalizedMetadata({
  locale,
  path,
  title,
  description,
  image,
  absoluteTitle = false,
  noindex = false,
  jsonLd,
}: LocalizedMetadataInput): Metadata {
  const lang = resolveLocale(locale);

  const canonical = getLocalizedPath(path, lang);
  const languages: Record<string, string> = {};
  for (const [tag, l] of Object.entries(hreflangTags)) {
    languages[tag] = getLocalizedPath(path, l as Locale);
  }
  // x-default points at the primary language (unprefixed Persian).
  languages["x-default"] = getLocalizedPath(path, "fa");

  const ogLocale = lang === "fa" ? "fa_IR" : "en_US";
  const ogAlternateLocale = lang === "fa" ? "en_US" : "fa_IR";

  return {
    ...(absoluteTitle ? { title: { absolute: title } } : { title }),
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      locale: ogLocale,
      alternateLocale: ogAlternateLocale,
      type: defaultOgType,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    ...(jsonLd ? { jsonLd } : {}),
  };
}

/** Trim a localized long-form text to a metadata-friendly description. */
export function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.min(cut.length, cut.lastIndexOf(" ")))}…`;
}
