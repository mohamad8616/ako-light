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
 * `productSlug` is used because the FK convention in this schema references
 * Product.slug (see prisma/schema.prisma header note).
 */
export const getProductImages = cache(
  async (productSlug: string): Promise<ProductImageRow[]> => {
    return prisma.productImage.findMany({
      where: { productId: productSlug },
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
  async (productSlug: string): Promise<ProductImageRow | null> => {
    const images = await getProductImages(productSlug);
    if (images.length === 0) return null;

    const primary = images.find((img) => img.isPrimary);
    return primary ?? images[0];
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