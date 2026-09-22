"use server";

/**
 * Server actions for the catalogue admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`.
 *
 * CatalogueItem has NO slug column — its `id` IS the route handle, so the form
 * supplies it. There is no SlugHistory coverage for catalogue items (they are
 * not part of CatalogModelType), which is why no recordSlugChange TODO appears
 * here.
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
  catalogueFormSchema,
  type CatalogueFormValues,
} from "@/lib/admin/schemas/catalogue";
import {
  createCatalogueItem,
  deleteCatalogueItem,
  updateCatalogueItem,
} from "@/lib/repositories/catalogue";

export async function createCatalogueAction(
  input: CatalogueFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = catalogueFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createCatalogueItem(parsed.data);
    revalidateCatalog("catalogue", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateCatalogueAction(
  id: string,
  input: CatalogueFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = catalogueFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateCatalogueItem(id, parsed.data);
    revalidateCatalog("catalogue", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyCatalogueAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    await deleteCatalogueItem(id);
    revalidateCatalog("catalogue");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
