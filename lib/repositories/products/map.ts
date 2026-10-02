import type { Prisma } from "@/generated/prisma/client";
import type { Product } from "@/lib/data/product-categories/types";
import { MEDIA_URL_SELECT, resolveMediaUrl } from "@/lib/media/resolve";
import {
  asDownloadLinks,
  asLocalized,
  asOptionalLocalized,
  asRelatedProducts,
} from "../casting";

/**
 * Row shape and mapping for product reads.
 *
 * Shared `include` for every product read in this layer.
 *
 * `productImages` is included so {@link mapProductRow} can derive the
 * backward-compatible `images: string[]` from the relational ProductImage
 * table (the flat `Product.images` column was dropped in Pass 11B).
 */
export const productInclude = {
  category: true,
  designer: true,
  // Pass 13.5C: the Media relations are joined so `mapProductRow` can prefer
  // them over the legacy URL columns (see lib/media/resolve.ts). Only the `url`
  // is selected — pulling whole Media rows into every product read would put
  // filename/size/storageKey into the public payload for no reason.
  heroMedia: MEDIA_URL_SELECT,
  hoverMedia: MEDIA_URL_SELECT,
  productImages: {
    orderBy: { sortOrder: "asc" },
    include: { media: MEDIA_URL_SELECT },
  },
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
 * - `priceEur` / `priceToman` are Postgres `Decimal` columns; the app-level
 *   `Product` exposes both as numbers (EUR is display-only, Toman is charged).
 * - `images` is derived from the product's ProductImage rows in `sortOrder`
 *   order (the flat `images` column was removed in Pass 11B; the DB rows are
 *   pre-ordered by the shared `include`).
 */
export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: asLocalized(row.name),
    slug: row.slug,
    // Media wins, legacy URL falls back — per row, not per table.
    images: row.productImages.map((img) => resolveMediaUrl(img.media, img.url)),
    hoverImage: resolveMediaUrl(row.hoverMedia, row.hoverImage),
    priceEur: row.priceEur.toNumber(),
    priceToman: row.priceToman.toNumber(),
    store: { existsInStore: row.existsInStore, quantity: row.quantity },
    category: row.category.slug,
    categoryLabel: row.category ? asLocalized(row.category.name) : undefined,
    heroImage: resolveMediaUrl(row.heroMedia, row.heroImage),
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
