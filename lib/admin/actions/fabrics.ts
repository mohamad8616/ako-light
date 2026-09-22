"use server";

/**
 * Server actions for the fabrics admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`.
 *
 * FabricItem has NO slug column — its `id` IS the route handle, so the form
 * supplies it and a rename changes future URLs directly. There is no
 * SlugHistory coverage for fabrics (it is not part of CatalogModelType), which
 * is why no recordSlugChange TODO appears here.
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
  fabricFormSchema,
  type FabricFormValues,
} from "@/lib/admin/schemas/fabric";
import {
  createFabricItem,
  deleteFabricItem,
  updateFabricItem,
} from "@/lib/repositories/fabrics";

export async function createFabricAction(
  input: FabricFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = fabricFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createFabricItem(parsed.data);
    revalidateCatalog("fabrics", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateFabricAction(
  id: string,
  input: FabricFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = fabricFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateFabricItem(id, parsed.data);
    revalidateCatalog("fabrics", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyFabricAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    await deleteFabricItem(id);
    revalidateCatalog("fabrics");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
