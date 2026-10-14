import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { asLocalized } from "../casting";

export type ProductOption = {
  id: string;
  slug: string;
  name: Localized;
  categorySlug: string;
  /** The parent category's display name, for the picker's category step. */
  categoryName: Localized;
};

/**
 * Every product as a picker option: `id`, `slug`, localized `name` and the
 * parent category's slug + localized name (the `ProductsUsedField` two-step
 * picker's group label). Ordered like `getProducts` — category navigation
 * order, then curated position — so the categories the picker derives from this
 * list come out in nav order without a second query.
 *
 * Deliberately `select`-scoped: the picker renders labels, so nothing else may
 * cross the wire.
 */
export const getProductOptions = cache(async (): Promise<ProductOption[]> => {
  const rows = await prisma.product.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: { select: { slug: true, name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: asLocalized(row.name),
    categorySlug: row.category.slug,
    categoryName: asLocalized(row.category.name),
  }));
});
