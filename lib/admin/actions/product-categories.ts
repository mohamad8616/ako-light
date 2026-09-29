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
  updateProductCategory,
} from "@/lib/repositories/product-categories";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

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
    const id = await createProductCategory(parsed.data, db);
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
    await updateWithSlugHistory(
      "productCategory",
      id,
      parsed.data.slug,
      (tx) => updateProductCategory(id, parsed.data, tx),
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
