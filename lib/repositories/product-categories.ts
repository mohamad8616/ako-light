/**
 * Product category reads — Prisma-backed replacement for the `productCategories`
 * constant in `lib/data/productCategories.ts`.
 *
 * Categories keep the navigation order stored in `ProductCategory.sortOrder`
 * (the order the source array had), with their products embedded, so the shape
 * handed to components is unchanged.
 */
import type { Prisma } from "@/generated/prisma/client";
import { NAV_CATEGORIES_TAG } from "@/lib/cache-tags";
import type {
  NavCategory,
  ProductCategory,
} from "@/lib/data/product-categories/types";
import type { Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import { unstable_cache } from "next/cache";
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

/**
 * Cache tag for the navigation rows, so an admin category edit can expire them
 * immediately instead of waiting out `NAV_CACHE_SECONDS`. Defined in
 * `lib/cache-tags` so the admin revalidation helper can import it without
 * pulling this module (and Prisma) in.
 */
export { NAV_CATEGORIES_TAG } from "@/lib/cache-tags";

/**
 * How long the nav rows may be served without re-reading the database.
 *
 * The nav is effectively static content — a handful of rows that change only
 * when an admin edits a category — but it is read by the (site) layout, i.e. on
 * EVERY public page render. Caching it takes a database round-trip off every
 * page; the tag above keeps an admin edit from having to wait this out.
 */
const NAV_CACHE_SECONDS = 60 * 60;

/**
 * Cross-request cache for the nav rows.
 *
 * Deliberately NOT the fail-soft wrapper: if this throws, the error must
 * propagate so that a failed read is never cached. `getNavCategories` below is
 * what turns a failure into a usable (empty) result.
 *
 * `unstable_cache` is soft-deprecated in Next 16 in favour of the `use cache`
 * directive, which requires the project-wide `cacheComponents` flag — too broad
 * a change to make for one query. Swap this for `use cache` + `cacheTag` when
 * that flag is adopted.
 */
const readNavCategories = unstable_cache(
  async (): Promise<NavCategory[]> => {
    return prisma.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
        i18nKey: true,
      },
    });
  },
  ["nav-categories"],
  { tags: [NAV_CATEGORIES_TAG], revalidate: NAV_CACHE_SECONDS },
);

/**
 * Categories for the nav menu, WITHOUT their products.
 *
 * This exists because `getProductCategories()` eager-loads every product with
 * its category, designer and ALL product images — and the nav used to be its
 * most frequent caller. Worse, the result was handed to `Navbar`, a `"use
 * client"` component, so the entire catalog (images included) was serialized
 * into the RSC payload of EVERY public page before `ProductsSheet` read two
 * strings off each category.
 *
 * FAIL-SOFT ON PURPOSE. This is the only database read on some public pages,
 * and the (site) layout awaits it before rendering anything — so a database
 * blip used to turn every page on the site, including fully static ones, into a
 * 500. The nav is decorative chrome: rendering the site without product links
 * is strictly better than rendering nothing at all. A failure therefore logs
 * loudly and yields an empty nav rather than propagating.
 *
 * Use `getProductCategories()` only where product data is genuinely rendered —
 * and note that those callers SHOULD fail loudly, because a catalog page with
 * no catalog is a bug, not a degraded state.
 */
export const getNavCategories = cache(async (): Promise<NavCategory[]> => {
  try {
    return await readNavCategories();
  } catch (error) {
    console.error(
      "[nav] Could not read product categories; rendering the site without the product menu. " +
        "Check the database connection.",
      error,
    );
    return [];
  }
});

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
  db: Prisma.TransactionClient = prisma,
): Promise<string> => {
  const row = await db.productCategory.create({
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
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.productCategory.update({
    where: { id },
    data: {
      slug: input.slug,
      i18nKey: input.i18nKey,
      name: asJsonInput(input.name),
      sortOrder: input.sortOrder,
    },
  });
};

export const deleteProductCategory = async (
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.productCategory.delete({ where: { id } });
};
