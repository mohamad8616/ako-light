"use server";

/**
 * Server actions for the categories admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`. Deleting a category cascades to its products — the delete
 * dialog surfaces `ProductCategoryAdminRow.productCount` before confirming.
 */
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminAccess } from "@/lib/admin/access";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import {
  productCategoryFormSchema,
  type ProductCategoryFormValues,
} from "@/lib/admin/schemas/product-category";
import {
  createProductCategory,
  deleteProductCategory,
  getProductCategoryI18nKey,
  updateProductCategory,
  type ProductCategoryWriteInput,
} from "@/lib/repositories/product-categories";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";
import { productKey } from "@/lib/i18n/localized";

/**
 * Supplies the `i18nKey` the form no longer asks for.
 *
 * A category's `i18nKey` is NOT dead data — it is the dictionary key its
 * display name is resolved through (`t(category.i18nKey)` on the category page,
 * `dict[category.i18nKey]` on the product page). So it must stay meaningful,
 * and deriving it here with the SAME helper the public pages already use to
 * build a key from a slug (`productKey`) is what keeps the two ends in step:
 * the derivation reproduces the seeded convention exactly
 * (`coffee-tables` → `products.coffeeTables`), so a category named the ordinary
 * way picks up its existing translation with no extra input, and a brand-new
 * one gets a deterministic, self-consistent key instead of a hand-typed guess.
 *
 * The column is still NOT NULL, so a value must be written:
 *
 *   - CREATE derives it from the slug;
 *   - UPDATE carries the row's EXISTING value straight through, so renaming a
 *     category's slug cannot silently detach it from its translation (and a
 *     save never rewrites a byte of data the form does not own).
 */
function withI18nKey(
  values: ProductCategoryFormValues,
  previous: string | null,
): ProductCategoryWriteInput {
  return {
    ...values,
    i18nKey: previous ?? productKey(values.slug),
  };
}

/**
 * Renaming a category records the old slug in `slug_history` so inbound links
 * to the previous URL 308-redirect to the current one. The history write and
 * the update share one transaction; a failed update leaves no orphaned history
 * row, and an unchanged slug records nothing.
 */

export async function createProductCategoryAction(
  input: ProductCategoryFormValues,
  db?: Prisma.TransactionClient,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = productCategoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createProductCategory(withI18nKey(parsed.data, null), db);
    revalidateCatalog("categories", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateProductCategoryAction(
  id: string,
  input: ProductCategoryFormValues,
  db?: Prisma.TransactionClient,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = productCategoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    // Read the stored key BEFORE the write: the form no longer carries it, and
    // this value is what keeps a slug rename from detaching the category from
    // its translation.
    const previousI18nKey = await getProductCategoryI18nKey(id);

    await updateWithSlugHistory(
      "productCategory",
      id,
      parsed.data.slug,
      (tx) =>
        updateProductCategory(
          id,
          withI18nKey(parsed.data, previousI18nKey),
          tx,
        ),
      // Join the caller's transaction when there is one, so a nested call stays
      // atomic with its parent instead of opening a second connection.
      { db },
    );
    revalidateCatalog("categories", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyProductCategoryAction(
  id: string,
  db?: Prisma.TransactionClient,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    await deleteProductCategory(id, db);
    revalidateCatalog("categories");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
