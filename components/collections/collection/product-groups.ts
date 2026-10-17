import type {
  SectionCategory,
  SectionProduct,
} from "@/components/collections/collection/ProductsInCollectionSection";
import { getProductCategories } from "@/lib/repositories/product-categories";

/**
 * Groups a flat "products used" list into the category sections
 * `ProductsInCollectionSection` renders — the shared step behind BOTH detail
 * pages that show it (a project's `productsUsed` join rows and a collection's
 * denormalized `usedProducts` snapshot).
 *
 * ── Why the caller supplies the mapper ──────────────────────────────────────
 *
 * The two sources carry the same grouping key but different row shapes: a
 * project row is a full catalog `Product`, while a collection snapshot row is
 * `{ name, slug, category, image }`. `toSectionProduct` is the only part that
 * differs, so it is the only part each page writes; the grouping and the
 * category-order resolution stay here.
 *
 * Category ORDER and labels come from `getProductCategories()` — the same
 * navigation order the rest of the site uses — and a category with no picked
 * products is omitted rather than rendered empty.
 *
 * Server-only by construction (it awaits a repository read); it lives beside
 * the section component so the type it produces and the type the component
 * consumes cannot drift.
 */
export async function groupProductsByCategory<T extends { category: string }>(
  products: T[],
  toSectionProduct: (product: T) => SectionProduct,
): Promise<SectionCategory[]> {
  const bySlug = new Map<string, SectionProduct[]>();
  for (const product of products) {
    const list = bySlug.get(product.category) ?? [];
    list.push(toSectionProduct(product));
    bySlug.set(product.category, list);
  }

  const categories = await getProductCategories();
  const result: SectionCategory[] = [];
  for (const category of categories) {
    const list = bySlug.get(category.slug);
    if (list && list.length > 0) {
      result.push({
        name: category.name,
        slug: category.slug,
        i18nKey: category.i18nKey,
        products: list,
      });
    }
  }
  return result;
}
