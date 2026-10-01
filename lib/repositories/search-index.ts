/**
 * Search index reads — the minimal shape the client search UI needs.
 *
 * WHY THIS EXISTS
 *
 * `/search` used to call `getProducts()` and `getDesigners()` and hand the
 * result straight to `SearchHeader`, a `"use client"` component. That serialized
 * the ENTIRE catalog into the page payload: every product carried its full
 * description, moreInfo, download links, related-product list, both prices,
 * stock figures, its designer and every product image — and the search only ever
 * reads the name, slug, category, one image and the designer's name.
 *
 * The index below selects exactly those fields. `faName` is the one extra: the
 * Persian product name kept in the translation dictionary, which differs from
 * the DB's `name.fa` and must stay searchable. It is resolved HERE, on the
 * server, which is also what lets `SearchResults` stop importing the whole
 * dictionary into the client bundle.
 */
import type { Localized } from "@/lib/i18n/localized";
import { productKey } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";
import { prisma } from "@/lib/db/prisma";
import { cache } from "react";
import { asLocalized } from "./casting";

/** One product, reduced to the fields search actually matches and renders. */
export type SearchProduct = {
  id: string;
  slug: string;
  /** Parent category slug — used to build `/products/<category>/<slug>`. */
  category: string;
  /** Both locales: a Persian query must match the Persian name. */
  name: Localized;
  /** First gallery image, falling back to the hero image (what the card shows). */
  image: string;
  /** Designer's localized name, so searching a designer surfaces their products. */
  designerName: Localized;
  /**
   * The Persian name held in the translation dictionary (`products.<slug>`),
   * pre-resolved on the server. Empty when the dictionary has no entry.
   */
  faName: string;
};

/** One designer, reduced to what the designer card renders. */
export type SearchDesigner = {
  slug: string;
  name: Localized;
  image: string;
};

export type SearchIndex = {
  products: SearchProduct[];
  designers: SearchDesigner[];
};

/**
 * The whole searchable dataset, one query per entity.
 *
 * Both reads are `select`-only and skip every column search does not use; the
 * two run in parallel because neither depends on the other. `cache()` dedupes
 * them within a request the same way the other readers do.
 */
export const getSearchIndex = cache(async (): Promise<SearchIndex> => {
  const faDictionary = translations.fa as Record<string, string>;

  const [productRows, designerRows] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        // Fallback for a product with no gallery rows yet — same precedence the
        // full `Product` mapping used (images[0] ?? heroImage).
        heroImage: true,
        category: { select: { slug: true } },
        designer: { select: { name: true } },
        // Only the FIRST image is ever rendered, so only one row is fetched
        // (instead of every ProductImage for every product).
        productImages: {
          select: { url: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    }),
    prisma.designer.findMany({
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, image: true },
    }),
  ]);

  return {
    products: productRows.map((row) => {
      const key = productKey(row.slug);
      const translated = faDictionary[key];
      return {
        id: row.id,
        slug: row.slug,
        category: row.category.slug,
        name: asLocalized(row.name),
        image: row.productImages[0]?.url ?? row.heroImage,
        designerName: row.designer
          ? asLocalized(row.designer.name)
          : { en: "", fa: "" },
        // `translations` falls back to nothing, so an absent entry yields the
        // key itself — treat that as "no name" rather than indexing the key.
        faName: translated && translated !== key ? translated : "",
      };
    }),
    designers: designerRows.map((row) => ({
      slug: row.slug,
      name: asLocalized(row.name),
      image: row.image,
    })),
  };
});
