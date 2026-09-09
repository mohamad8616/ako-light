import type { Locale } from "@/lib/i18n/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { siteUrl } from "./config";

/**
 * Minimal Schema.org JSON-LD helpers.
 *
 * Rendered server-side as inline <script type="application/ld+json"> tags
 * (see https://nextjs.org/docs/app/guides/json-ld). All values must come
 * from real project data — never invent addresses, prices, ratings, social
 * profiles, awards, etc.
 *
 * Ownership to avoid duplicates:
 *   - layout (global)  → Organization + WebSite
 *   - pages            → WebPage/Product/CreativeWork/Person/CollectionPage
 *                       + BreadcrumbList
 */

export interface JsonLdObject {
  "@context": string;
  "@type": string | string[];
  [key: string]: unknown;
}

/** Data structure for a schema.org breadcrumb item. */
export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Serialize a JSON-LD object to an HTML-safe script tag inner HTML.
 * `<` is escaped to `\u003c` to prevent XSS (per the Next.js docs).
 */
export function jsonLdScript(obj: JsonLdObject): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

/** Absolute URL for a path in the given locale (metadataBase-aware). */
export function absoluteUrl(path: string, locale: Locale): string {
  return `${siteUrl}${getLocalizedPath(path, locale)}`;
}

/** Organization — emitted once at the layout level. */
export function organizationJsonLd(name: string, description: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: siteUrl,
    description,
    // logo intentionally omitted — no verified logo asset path exists.
  };
}

/** WebSite — emitted once at the layout level. */
export function webSiteJsonLd(
  name: string,
  description: string,
  url: string,
  publisher: JsonLdObject,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    publisher,
  };
}

/** WebPage for standard content pages. */
export function webPageJsonLd(
  title: string,
  description: string,
  url: string,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url,
  };
}

/** CollectionPage — semantic type for collection listing pages. */
export function collectionPageJsonLd(
  title: string,
  description: string,
  url: string,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url,
  };
}

/** Product — used on real product detail pages. No fabricated commerce data. */
export function productJsonLd({
  name,
  description,
  url,
  image,
  brand,
}: {
  name: string;
  description: string;
  url: string;
  image?: string;
  brand: string;
}): JsonLdObject {
  const product: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url,
    brand: { "@type": "Brand", name: brand },
  };
  if (image) product.image = image;
  // sku/offers/price intentionally omitted — the placeholder data's price
  // fields are not reliable commercial data.
  return product;
}

/** CreativeWork/WebPage — used on project detail pages. */
export function creativeWorkJsonLd({
  name,
  description,
  url,
  image,
}: {
  name: string;
  description: string;
  url: string;
  image?: string;
}): JsonLdObject {
  const work: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": ["CreativeWork", "WebPage"],
    name,
    description,
    url,
  };
  if (image) work.image = image;
  return work;
}

/** Person — used on designer detail pages for individual designers. */
export function personJsonLd({
  name,
  description,
  url,
  image,
}: {
  name: string;
  description: string;
  url: string;
  image?: string;
}): JsonLdObject {
  const person: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    description,
    url,
  };
  if (image) person.image = image;
  // website omitted — the data uses "#" placeholders, not real URLs.
  return person;
}

/**
 * BreadcrumbList — for nested pages. `items` are ordered root → current.
 * Every label must already be localized.
 */
export function breadcrumbListJsonLd(
  items: BreadcrumbItem[],
  locale: Locale,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path, locale),
    })),
  };
}