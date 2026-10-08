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
import { deleteStorageUrls, removedUrls } from "@/lib/admin/storage-cleanup";
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
  getMaterialImageUrls,
  updateMaterial,
} from "@/lib/repositories/materials";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

/**
 * Renaming a material records the old slug in `slug_history` so inbound links
 * to the previous URL 308-redirect to the current one. The history write and
 * the update share one transaction, so a failed update never leaves an
 * orphaned history row. An unchanged slug records nothing.
 */

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
    // Read before writing, delete after: an upload the admin replaced is only
    // garbage-collected once the new URL is safely persisted.
    const beforeUrls = await getMaterialImageUrls(id);

    await updateWithSlugHistory("material", id, parsed.data.slug, (tx) =>
      updateMaterial(id, parsed.data, tx),
    );

    await deleteStorageUrls(removedUrls(beforeUrls, [parsed.data.image]));
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
    const beforeUrls = await getMaterialImageUrls(id);

    await deleteMaterial(id);

    await deleteStorageUrls(beforeUrls);
    revalidateCatalog("materials");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
