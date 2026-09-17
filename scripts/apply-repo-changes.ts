/** Applies repository changes that the editor tool couldn't match due to CRLF. */
import { writeFileSync, readFileSync } from "node:fs";

// ---- 1. Rewrite lib/repositories/product-images.ts ----
const productImagesPath = "lib/repositories/product-images.ts";
const productImages = `/**
 * ProductImage reads — Prisma-backed access to the product_image table.
 *
 * Product images were previously embedded as a flat \`String[]\` on Product.
 * This repository gives components access to the relational model (ordering,
 * primary-image flag, alt text) when needed, while the Product repository
 * still exposes the backward-compatible \`images: string[]\` field for existing
 * call sites.
 */
import { cache } from "react";
import type { ProductImage as ProductImageRow } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * All images for a product, in \`sortOrder\` order.
 *
 * The FK column \`productId\` references \`Product.id\` (not slug) per the schema's
 * id-based FK convention. Callers should pass the product's \`id\`; since
 * \`id == slug\` for seeded data, passing the slug also works, but \`id\` is
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
 * The primary image for a product (the one with \`isPrimary: true\`).
 *
 * Falls back to the first image by \`sortOrder\` when no image is marked
 * primary, which mirrors the old behavior of \`Product.images[0]\`.
 */
export const getProductPrimaryImage = cache(
  async (productId: string): Promise<ProductImageRow | null> => {
    const images = await getProductImages(productId);
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
`;
writeFileSync(productImagesPath, productImages);
console.log("Rewrote product-images.ts");

// ---- 2. Update lib/repositories/products.ts comments ----
const productsPath = "lib/repositories/products.ts";
let products = readFileSync(productsPath, "utf8");

products = products.replace(
  "- `category` is `categoryId`: the FK column holds the `ProductCategory.slug`",
  "- `category` is `categoryId`: the FK column holds the `ProductCategory.id`",
);
products = products.replace(
  "  per the schema's FK convention.",
  "  per the schema's id-based FK convention (references `[id]`, not slug).",
);
products = products.replace(
  "  async (categorySlug: string): Promise<Product[]> => {\n    const rows = await prisma.product.findMany({\n      where: { categoryId: categorySlug },",
  "  async (categoryId: string): Promise<Product[]> => {\n    const rows = await prisma.product.findMany({\n      where: { categoryId },",
);
writeFileSync(productsPath, products);
console.log("Updated products.ts");
