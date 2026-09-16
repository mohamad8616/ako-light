/**
 * Product reads — Prisma-backed replacement for the product arrays in
 * `lib/data/productCategories.ts` (`lib/data/product-categories/*`).
 *
 * The public API mirrors the static module so call sites change minimally, and
 * every reader is wrapped in React's `cache()` so repeated lookups inside one
 * request (page + `generateMetadata`, nested layouts) hit the database once.
 */
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { Product } from "@/lib/data/product-categories/types";
import { prisma } from "@/lib/db/prisma";
import {
  asDownloadLinks,
  asLocalized,
  asOptionalLocalized,
  asRelatedProducts,
} from "./casting";

/** Shared `include` for every product read in this layer. */
export const productInclude = {
  category: true,
  designer: true,
} satisfies Prisma.ProductInclude;

/** A `product` row after {@link productInclude} has been applied. */
export type ProductRow = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

/**
 * Maps a row onto the `Product` interface from
 * `lib/data/product-categories/types.ts`.
 *
 * - `category` is `categoryId`: the FK column holds the `ProductCategory.slug`
 *   per the schema's FK convention.
 * - `designer.href` is rebuilt from the designer's slug (`/designers/<slug>`),
 *   which is exactly what the source data stored.
 * - `categoryLabel` has no column of its own — the source data duplicated the
 *   parent category's localized name there, so it is derived from the relation.
 * - `price` is a Postgres `Decimal`; `Product.price` in the app is a number.
 */
export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: asLocalized(row.name),
    slug: row.slug,
    images: row.images,
    hoverImage: row.hoverImage,
    price: row.price.toNumber(),
    store: { existsInStore: row.existsInStore, quantity: row.quantity },
    category: row.categoryId,
    categoryLabel: row.category ? asLocalized(row.category.name) : undefined,
    heroImage: row.heroImage,
    description: asLocalized(row.description),
    moreInfo: asOptionalLocalized(row.moreInfo),
    downloads: asDownloadLinks(row.downloads),
    designer: row.designer
      ? {
          name: asLocalized(row.designer.name),
          href: `/designers/${row.designer.slug}`,
        }
      : { name: { en: "", fa: "" }, href: "" },
    related: asRelatedProducts(row.related),
  };
}

/**
 * One product by category + slug — mirrors the static module's
 * `getProduct(category, slug)` so call sites change minimally (import swap +
 * `await`; the sync `undefined` miss becomes an async `null` miss).
 *
 * Also accepts a single slug (`getProduct(slug)`) for the generic
 * single-argument style: a global lookup by the unique `Product.slug`.
 */
export const getProduct = cache(
  async (categoryOrSlug: string, slug?: string): Promise<Product | null> => {
    if (slug === undefined) {
      const row = await prisma.product.findUnique({
        where: { slug: categoryOrSlug },
        include: productInclude,
      });

      return row ? mapProductRow(row) : null;
    }

    const row = await prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });

    if (!row) return null;
    if (row.categoryId !== categoryOrSlug) return null;

    return mapProductRow(row);
  },
);

/**
 * Every product, in category order (`ProductCategory.sortOrder`) and then by
 * the curated position inside its category (`Product.sortOrder`, i.e. the
 * source array order).
 */
export const getProducts = cache(async (): Promise<Product[]> => {
  const rows = await prisma.product.findMany({
    include: productInclude,
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  return rows.map(mapProductRow);
});

/**
 * Every product in one category, in curated `sortOrder` position. Powers the
 * "related products" section on the detail page without pulling the whole
 * catalog client-side.
 */
export const getProductsByCategory = cache(
  async (categorySlug: string): Promise<Product[]> => {
    const rows = await prisma.product.findMany({
      where: { categoryId: categorySlug },
      include: productInclude,
      orderBy: { sortOrder: "asc" },
    });

    return rows.map(mapProductRow);
  },
);

/**
 * Batch lookup for cart resolution: takes an array of `{ productId, slug }`
 * and returns the matching `Product` records. Id-first matching with slug
 * fallback is handled by the caller; rows are simply keyed on either field.
 */
export const getProductsByIdsOrSlugs = cache(
  async (
    keys: { productId?: string; slug?: string }[],
  ): Promise<Product[]> => {
    const ids = [...new Set(keys.map((k) => k.productId).filter(Boolean))] as string[];
    const slugs = [...new Set(keys.map((k) => k.slug).filter(Boolean))] as string[];
    if (ids.length === 0 && slugs.length === 0) return [];

    const rows = await prisma.product.findMany({
      where: {
        OR: [
          ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
          ...(slugs.length > 0 ? [{ slug: { in: slugs } }] : []),
        ],
      },
      include: productInclude,
    });

    return rows.map(mapProductRow);
  },
);
