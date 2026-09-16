import type { MetadataRoute } from "next";
import { getLocalizedPath, type Locale } from "@/lib/i18n/routing";
import { getCollections } from "@/lib/repositories/collections";
import { getDesigners } from "@/lib/repositories/designers";
import { getFlagshipsWithDetail } from "@/lib/repositories/flagships";
import { getMaterials } from "@/lib/repositories/materials";
import { getProductCategories } from "@/lib/repositories/product-categories";
import { getProjects } from "@/lib/repositories/projects";
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    collections,
    productCategories,
    designers,
    materials,
    flagshipsWithDetail,
    projects,
  ] = await Promise.all([
    getCollections(),
    getProductCategories(),
    getDesigners(),
    getMaterials(),
    getFlagshipsWithDetail(),
    getProjects(),
  ]);

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
    ...flagshipsWithDetail.map((f) => `/flagship/${f.slug}`),
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
