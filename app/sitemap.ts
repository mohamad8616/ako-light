import type { MetadataRoute } from "next";
import { collections } from "@/lib/data/collections";
import { designers } from "@/lib/data/designers";
import { flagshipDetails } from "@/lib/data/flagships";
import { materials } from "@/lib/data/materials";
import { productCategories } from "@/lib/data/productCategories";
import { projects } from "@/lib/data/projects";
import { getLocalizedPath, type Locale } from "@/lib/i18n/routing";
import { siteUrl } from "@/lib/seo/config";

const SITEMAP_LOCALES: Locale[] = ["fa", "en"];

/**
 * Sitemap for the public site in both languages.
 *
 * Every canonical URL is emitted explicitly: Persian unprefixed and English
 * /en. Each entry carries its language alternates (fa-IR / en-US) so
 * crawlers see the full language mapping either way.
 *
 *  - No /fa/... URLs (not canonical) and no /search (noindex).
 *  - Dynamic URLs come from the same data sources the pages use, so every
 *    listed URL is guaranteed to exist.
 *  - No fabricated lastModified: the placeholder data has no reliable
 *    modification dates.
 */
function localizedEntry(path: string, locale: Locale): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${getLocalizedPath(path, locale)}`,
    alternates: {
      languages: {
        "fa-IR": `${siteUrl}${getLocalizedPath(path, "fa")}`,
        "en-US": `${siteUrl}${getLocalizedPath(path, "en")}`,
      },
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "/",
    "/about",
    "/products",
    "/collections",
    "/projects",
    "/designers",
    "/materials",
    "/flagship",
    "/contact",
    "/catalogue",
    "/s34",
  ];

  const dynamicPaths: string[] = [
    // Collection detail pages
    ...collections.map((c) => `/collections/${c.slug}`),
    // Product category pages
    ...productCategories.map((c) => `/products/${c.slug}`),
    // Individual product pages
    ...productCategories.flatMap((c) =>
      c.products.map((p) => `/products/${c.slug}/${p.slug}`),
    ),
    // Designer pages
    ...designers.map((d) => `/designers/${d.slug}`),
    // Material pages
    ...materials.map((m) => `/materials/${m.id}`),
    // Flagship detail pages — only the ones that exist (have detail content)
    ...Object.keys(flagshipDetails).map((slug) => `/flagship/${slug}`),
    // Project pages
    ...projects.map((p) => `/projects/${p.id}`),
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const path of [...staticPaths, ...dynamicPaths]) {
    for (const locale of SITEMAP_LOCALES) {
      entries.push(localizedEntry(path, locale));
    }
  }
  return entries;
}
