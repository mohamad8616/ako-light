/**
 * ProductImage reads — Prisma-backed access to the product_image table.
 *
 * Product images were previously embedded as a flat `String[]` on Product.
 * This repository gives components access to the relational model (ordering,
 * primary-image flag, alt text) when needed, while the Product repository
 * still exposes the backward-compatible `images: string[]` field for existing
 * call sites.
 */
import { cache } from "react";
import type { ProductImage as ProductImageRow } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * All images for a product, in `sortOrder` order.
 *
 * The FK column `productId` references `Product.id` (not slug) per the schema's
 * id-based FK convention. The caller should pass the product's `id`; since
 * `id == slug` for seeded data, passing the slug also works, but `id` is
 * correct for the post-migration convention.
 */
export const getProductImages = cache(
  async (productId: string): Promise<ProductImageRow[]> => {
    return prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: "asc" },
    });
  },
);

/**
 * The primary image for a product (the one with `isPrimary: true`).
 *
 * Falls back to the first image by `sortOrder` when no image is marked
 * primary, which mirrors the old behavior of `Product.images[0]`.
 */
export const getProductPrimaryImage = cache(
  async (productId: string): Promise<ProductImageRow | null> => {
    const images = await getProductImages(productId);

    const primary = images.find((img) => img.isPrimary);
    return primary ?? images[0] ?? null;
  },
);

/**
 * One image by its id.
 */
export const getProductImage = cache(
  async (id: string): Promise<ProductImageRow | null> => {
    return prisma.productImage.findUnique({ where: { id } });
  },
);