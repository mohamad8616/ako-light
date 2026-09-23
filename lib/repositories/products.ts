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
import type { Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import {
  asDownloadLinks,
  asJsonInput,
  asLocalized,
  asNullableJsonInput,
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
  async (keys: { productId?: string; slug?: string }[]): Promise<Product[]> => {
    const ids = [
      ...new Set(keys.map((k) => k.productId).filter(Boolean)),
    ] as string[];
    const slugs = [
      ...new Set(keys.map((k) => k.slug).filter(Boolean)),
    ] as string[];
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

export type ProductAdminRow = {
  id: string;
  slug: string;
  name: Localized;
  categoryId: string;
  categoryName: Localized;
  designerId?: string | null;
  designerName?: Localized | null;
  price: number;
  existsInStore: boolean;
  quantity: number;
  sortOrder: number;
  imageCount: number;
};

export type ProductAdminDetail = {
  id: string;
  slug: string;
  name: Localized;
  hoverImage: string;
  heroImage: string;
  price: number;
  existsInStore: boolean;
  quantity: number;
  description: Localized;
  moreInfo?: Localized | null;
  downloads: { label: Localized; href: string }[];
  related: { name: Localized; slug: string; category: string; image: string }[];
  sortOrder: number;
  categoryId: string;
  designerId: string | null;
  images: {
    id?: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
  }[];
};

export type ProductWriteInput = {
  slug: string;
  name: Localized;
  hoverImage: string;
  heroImage: string;
  price: number;
  existsInStore: boolean;
  quantity: number;
  description: Localized;
  moreInfo?: Localized | null;
  downloads: { label: Localized; href: string }[];
  related: { name: Localized; slug: string; category: string; image: string }[];
  sortOrder: number;
  categoryId: string;
  designerId: string | null;
  images: {
    id?: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
  }[];
};

export type ProductOption = {
  id: string;
  slug: string;
  name: Localized;
  categorySlug: string;
};

/**
 * Every product as a picker option: `id`, `slug`, localized `name` and the
 * parent category's slug (the `ProductsUsedField` group label). Ordered like
 * {@link getProducts} — category navigation order, then curated position.
 */
export const getProductOptions = cache(async (): Promise<ProductOption[]> => {
  const rows = await prisma.product.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: { select: { slug: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: asLocalized(row.name),
    categorySlug: row.category.slug,
  }));
});

export const getProductAdminRows = cache(
  async (): Promise<ProductAdminRow[]> => {
    const rows = await prisma.product.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        category: true,
        designer: true,
        _count: { select: { productImages: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: asLocalized(row.name),
      categoryId: row.categoryId,
      categoryName: asLocalized(row.category.name),
      designerId: row.designerId,
      designerName: row.designer ? asLocalized(row.designer.name) : null,
      price: row.price.toNumber(),
      existsInStore: row.existsInStore,
      quantity: row.quantity,
      sortOrder: row.sortOrder,
      imageCount: row._count.productImages,
    }));
  },
);

export const getProductAdminDetail = cache(
  async (id: string): Promise<ProductAdminDetail | null> => {
    const row = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        designer: true,
        productImages: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      name: asLocalized(row.name),
      hoverImage: row.hoverImage,
      heroImage: row.heroImage,
      price: row.price.toNumber(),
      existsInStore: row.existsInStore,
      quantity: row.quantity,
      description: asLocalized(row.description),
      moreInfo: asOptionalLocalized(row.moreInfo),
      downloads: asDownloadLinks(row.downloads),
      related: asRelatedProducts(row.related),
      sortOrder: row.sortOrder,
      categoryId: row.categoryId,
      designerId: row.designerId,
      images: row.productImages.map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.alt,
        isPrimary: image.isPrimary,
      })),
    };
  },
);

export const createProduct = async (
  input: ProductWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<string> => {
  // A caller-supplied client (the test suite passes its rolled-back
  // transaction) is already transactional — run on it directly. The default
  // client opens its own transaction so row + images stay atomic.
  const run = async (tx: Prisma.TransactionClient) => {
    const created = await tx.product.create({
      data: {
        id: input.slug,
        slug: input.slug,
        name: asJsonInput(input.name),
        hoverImage: input.hoverImage,
        price: input.price,
        existsInStore: input.existsInStore,
        quantity: input.quantity,
        heroImage: input.heroImage,
        description: asJsonInput(input.description),
        // Optional jsonb: real SQL NULL when the product has no extra info block.
        moreInfo: asNullableJsonInput(input.moreInfo),
        downloads: asJsonInput(input.downloads),
        related: asJsonInput(input.related),
        sortOrder: input.sortOrder,
        categoryId: input.categoryId,
        designerId: input.designerId,
      },
    });

    if (input.images.length > 0) {
      await tx.productImage.createMany({
        data: input.images.map((image, index) => ({
          id: image.id ?? crypto.randomUUID(),
          productId: created.id,
          url: image.url,
          alt: image.alt ?? null,
          isPrimary: image.isPrimary,
          sortOrder: index,
        })),
      });
    }

    return created;
  };

  const row = db === prisma ? await prisma.$transaction(run) : await run(db);
  return row.id;
};

export const updateProduct = async (
  id: string,
  input: ProductWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const run = async (tx: Prisma.TransactionClient) => {
    await tx.product.update({
      where: { id },
      data: {
        slug: input.slug,
        name: asJsonInput(input.name),
        hoverImage: input.hoverImage,
        price: input.price,
        existsInStore: input.existsInStore,
        quantity: input.quantity,
        heroImage: input.heroImage,
        description: asJsonInput(input.description),
        // Optional jsonb: real SQL NULL when the product has no extra info block.
        moreInfo: asNullableJsonInput(input.moreInfo),
        downloads: asJsonInput(input.downloads),
        related: asJsonInput(input.related),
        sortOrder: input.sortOrder,
        categoryId: input.categoryId,
        designerId: input.designerId,
      },
    });

    const existing = await tx.productImage.findMany({
      where: { productId: id },
    });
    const nextIds = new Set(
      input.images.filter((image) => image.id).map((image) => image.id!),
    );

    const toDelete = existing.filter((image) => !nextIds.has(image.id));
    if (toDelete.length > 0) {
      await tx.productImage.deleteMany({
        where: { id: { in: toDelete.map((image) => image.id) } },
      });
    }

    for (const [index, image] of input.images.entries()) {
      if (image.id) {
        await tx.productImage.update({
          where: { id: image.id },
          data: {
            url: image.url,
            alt: image.alt ?? null,
            isPrimary: image.isPrimary,
            sortOrder: index,
          },
        });
      } else {
        await tx.productImage.create({
          data: {
            id: crypto.randomUUID(),
            productId: id,
            url: image.url,
            alt: image.alt ?? null,
            isPrimary: image.isPrimary,
            sortOrder: index,
          },
        });
      }
    }
  };

  if (db === prisma) {
    await prisma.$transaction(run);
  } else {
    await run(db);
  }
};

export const deleteProduct = async (
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.product.delete({ where: { id } });
};
