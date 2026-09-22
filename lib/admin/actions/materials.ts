"use server";

/**
 * Server actions for the materials admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`. The form's app-level `type` union is mapped to the Prisma
 * enum inside the repository ("stone-composite" <-> stone_composite).
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
  materialFormSchema,
  type MaterialFormValues,
} from "@/lib/admin/schemas/material";
import {
  createMaterial,
  deleteMaterial,
  updateMaterial,
} from "@/lib/repositories/materials";

// TODO(slug-history): record the previous slug via recordSlugChange() before a
// rename lands (the redemption pass). Deferred on purpose: SlugHistory is
// @@unique([modelType, oldSlug]), so an A→B→A→B rename chain would throw until
// duplicate handling exists. The form warns that public URLs change instead.

export async function createMaterialAction(
  input: MaterialFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = materialFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createMaterial(parsed.data);
    revalidateCatalog("materials", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateMaterialAction(
  id: string,
  input: MaterialFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = materialFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateMaterial(id, parsed.data);
    revalidateCatalog("materials", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyMaterialAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    await deleteMaterial(id);
    revalidateCatalog("materials");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
