"use server";

/**
 * Server actions for the categories admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`. Deleting a category cascades to its products — the delete
 * dialog surfaces `ProductCategoryAdminRow.productCount` before confirming.
 */
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

// TODO(slug-history): record the previous slug via recordSlugChange() before a
// rename lands (the redemption pass). Deferred on purpose: SlugHistory is
// @@unique([modelType, oldSlug]), so an A→B→A→B rename chain would throw until
// duplicate handling exists. The form warns that public URLs change instead.

export async function createProductCategoryAction(
  input: ProductCategoryFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = productCategoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createProductCategory(parsed.data);
    revalidateCatalog("categories", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateProductCategoryAction(
  id: string,
  input: ProductCategoryFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = productCategoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateProductCategory(id, parsed.data);
    revalidateCatalog("categories", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyProductCategoryAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    await deleteProductCategory(id);
    revalidateCatalog("categories");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
