import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { asLocalized } from "../casting";

export type ProductOption = {
  id: string;
  slug: string;
  name: Localized;
  categorySlug: string;
};

/**
 * Every product as a picker option: `id`, `slug`, localized `name` and the
 * parent category's slug (the `ProductsUsedField` group label). Ordered like
 * `getProducts` — category navigation order, then curated position.
 *
 * Deliberately `select`-scoped to four columns: the picker renders a label, so
 * nothing else may cross the wire.
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
