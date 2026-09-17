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

/** Shared `include` for every product read in this layer.
 *
 * `productImages` is included so {@link mapProductRow} can derive the
 * backward-compatible `images: string[]` from the relational ProductImage
 * table (the flat `Product.images` column was dropped in Pass 11B).
 */
export const productInclude = {
  category: true,
  designer: true,
  productImages: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

/** A `product` row after {@link productInclude} has been applied. */
export type ProductRow = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

/**
 * Maps a row onto the `Product` interface from
 * `lib/data/product-categories/types.ts`.
 *
 * - `category` is the parent `ProductCategory`'s *slug* (the route handle).
 *   The FK column `Product.categoryId` holds `ProductCategory.id` per the
 *   id-based FK convention, so the slug is read off the joined relation.
 * - `designer.href` is rebuilt from the designer's slug (`/designers/<slug>`),
 *   which is exactly what the source data stored.
 * - `categoryLabel` has no column of its own — the source data duplicated the
 *   parent category's localized name there, so it is derived from the relation.
 * - `price` is a Postgres `Decimal`; `Product.price` in the app is a number.
 * - `images` is derived from the product's ProductImage rows in `sortOrder`
 *   order (the flat `images` column was removed in Pass 11B; the DB rows are
 *   pre-ordered by the shared `include`).
 */
export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: asLocalized(row.name),
    slug: row.slug,
    images: row.productImages.map((img) => img.url),
    hoverImage: row.hoverImage,
    price: row.price.toNumber(),
    store: { existsInStore: row.existsInStore, quantity: row.quantity },
    category: row.category.slug,
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
    if (row.category.slug !== categoryOrSlug) return null;

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
    const category = await prisma.productCategory.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });
    if (!category) return [];
    const rows = await prisma.product.findMany({
      // Resolve the route handle first; the relation itself is keyed by id.
      where: { categoryId: category.id },
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
