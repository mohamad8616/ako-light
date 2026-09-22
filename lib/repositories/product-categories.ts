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
import type { Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import { cache } from "react";
import { asJsonInput, asLocalized } from "./casting";
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

export type ProductCategoryAdminRow = {
  id: string;
  slug: string;
  i18nKey: string;
  name: Localized;
  sortOrder: number;
  productCount: number;
};

export type ProductCategoryOption = {
  id: string;
  name: Localized;
};

export type ProductCategoryWriteInput = {
  slug: string;
  i18nKey: string;
  name: Localized;
  sortOrder: number;
};

export const getProductCategoryOptions = cache(
  async (): Promise<ProductCategoryOption[]> => {
    const rows = await prisma.productCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    });

    return rows.map((row) => ({
      id: row.id,
      name: asLocalized(row.name),
    }));
  },
);

export const getProductCategoryAdminRows = cache(
  async (): Promise<ProductCategoryAdminRow[]> => {
    const rows = await prisma.productCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      i18nKey: row.i18nKey,
      name: asLocalized(row.name),
      sortOrder: row.sortOrder,
      productCount: row._count.products,
    }));
  },
);

export const createProductCategory = async (
  input: ProductCategoryWriteInput,
): Promise<string> => {
  const row = await prisma.productCategory.create({
    data: {
      id: input.slug,
      slug: input.slug,
      i18nKey: input.i18nKey,
      name: asJsonInput(input.name),
      sortOrder: input.sortOrder,
    },
  });

  return row.id;
};

export const updateProductCategory = async (
  id: string,
  input: ProductCategoryWriteInput,
): Promise<void> => {
  await prisma.productCategory.update({
    where: { id },
    data: {
      slug: input.slug,
      i18nKey: input.i18nKey,
      name: asJsonInput(input.name),
      sortOrder: input.sortOrder,
    },
  });
};

export const deleteProductCategory = async (id: string): Promise<void> => {
  await prisma.productCategory.delete({ where: { id } });
};
