"use server";

/**
 * Server actions for the products admin section.
 *
 * Every action re-runs `requireAdminAccess()` (server functions are reachable
 * by direct POST, so re-authorization inside the action is mandatory — see the
 * bundled data-security guide), re-validates the payload with the SAME zod
 * schema the client form uses (client validation is never trusted), and maps
 * failures into the structured `ActionResult` contract. All persistence goes
 * through lib/repositories/products.ts — no Prisma calls here.
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
  productFormSchema,
  type ProductFormValues,
} from "@/lib/admin/schemas/product";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/lib/repositories/products";

// TODO(slug-history): record the previous slug via recordSlugChange() before a
// rename lands (the redemption pass). Deferred on purpose: SlugHistory is
// @@unique([modelType, oldSlug]), so an A→B→A→B rename chain would throw until
// duplicate handling exists. For now a rename simply takes effect — the form
// warns that public URLs change, and no redirect history is recorded.

/** Creates a product (images included) and returns its new id. */
export async function createProductAction(
  input: ProductFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createProduct(parsed.data);
    revalidateCatalog("products", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateProductAction(
  id: string,
  input: ProductFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateProduct(id, parsed.data);
    revalidateCatalog("products", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyProductAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    await deleteProduct(id);
    revalidateCatalog("products");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
