import { z } from "zod";
import { localizedSchema, slugSchema, sortOrderSchema } from "./common";

/**
 * The product-category form's rules (mirrors `ProductCategoryWriteInput`, minus
 * `i18nKey`).
 *
 * ── Why `i18nKey` is not asked for ──────────────────────────────────────────
 *
 * Unlike a PROJECT's (a leftover nothing reads), a category's `i18nKey` IS read
 * at runtime: it is the dictionary key that resolves the category's display
 * name (`t(category.i18nKey)` on the category page, `dict[category.i18nKey]` on
 * the product page). So it cannot simply be dropped — it has to be SUPPLIED,
 * and the operator should not be the one supplying it: typing a key by hand
 * was both busywork and a way to point a category at the wrong translation.
 *
 * The value is DERIVED instead, by the server action, with the same helper the
 * public pages already use to build the key from a slug
 * (`productKey`, lib/i18n/localized.ts). That reproduces the seeded convention
 * exactly — `coffee-tables` → `products.coffeeTables` — so a category named in
 * the ordinary way picks up its existing translation with no extra input, and a
 * brand-new one gets a deterministic, self-consistent key. See
 * `lib/admin/actions/product-categories.ts#withI18nKey`.
 */
export const productCategoryFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  sortOrder: sortOrderSchema,
});

export type ProductCategoryFormValues = z.infer<
  typeof productCategoryFormSchema
>;
