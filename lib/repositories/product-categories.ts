/**
 * Product category reads — Prisma-backed replacement for the `productCategories`
 * constant in `lib/data/productCategories.ts`.
 *
 * Categories keep the navigation order stored in `ProductCategory.sortOrder`
 * (the order the source array had), with their products embedded, so the shape
 * handed to components is unchanged.
 */
import type { Prisma } from "@/generated/prisma/client";
import type { ProductCategory } from "@/lib/data/product-categories/types";
import { prisma } from "@/lib/db/prisma";
import { cache } from "react";
import { asLocalized } from "./casting";
import { mapProductRow, productInclude } from "./products";

/** Shared `include` for every category read in this layer. */
export const productCategoryInclude = {
  products: { include: productInclude, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductCategoryInclude;

/** A `product_category` row after {@link productCategoryInclude} was applied. */
export type ProductCategoryRow = Prisma.ProductCategoryGetPayload<{
  include: typeof productCategoryInclude;
}>;

function mapProductCategoryRow(row: ProductCategoryRow): ProductCategory {
  return {
    id: row.id,
    name: asLocalized(row.name),
    slug: row.slug,
    i18nKey: row.i18nKey,
    products: row.products.map(mapProductRow),
  };
}

/** One category (with its products) by slug. */
export const getProductCategory = cache(
  async (slug: string): Promise<ProductCategory | null> => {
    const row = await prisma.productCategory.findUnique({
      where: { slug },
      include: productCategoryInclude,
    });

    return row ? mapProductCategoryRow(row) : null;
  },
);

/** All categories in navigation order, each with its products. */
export const getProductCategories = cache(
  async (): Promise<ProductCategory[]> => {
    const rows = await prisma.productCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: productCategoryInclude,
    });

    return rows.map(mapProductCategoryRow);
  },
);
