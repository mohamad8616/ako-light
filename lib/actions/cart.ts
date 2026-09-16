/**
 * Server action for cart product resolution.
 *
 * `CartSheet` can be opened from any page, so it cannot rely on catalog data
 * threaded through page props. Instead it calls this action with the cart's
 * `{ productId, slug }` pairs and gets back live `Product` records.
 *
 * Matching contract (mirrors the old static `findProduct` exactly):
 * id-first, slug fallback, missing products simply omitted.
 */
"use server";

import type { Product } from "@/lib/data/product-categories/types";
import { getProductsByIdsOrSlugs } from "@/lib/repositories/products";

export interface CartProductKey {
  productId: string;
  slug?: string;
}

/**
 * Resolve cart items to live products by id first, then slug. Unknown /
 * removed products are omitted so the caller can fall back gracefully.
 */
export async function resolveCartProducts(
  keys: CartProductKey[],
): Promise<Product[]> {
  if (keys.length === 0) return [];

  const rows = await getProductsByIdsOrSlugs(keys);
  const byId = new Map(rows.map((p) => [p.id, p]));
  const bySlug = new Map(rows.map((p) => [p.slug, p]));

  const resolved: Product[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const match =
      byId.get(key.productId) ??
      (key.slug !== undefined ? bySlug.get(key.slug) : undefined);
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      resolved.push(match);
    }
  }

  return resolved;
}
