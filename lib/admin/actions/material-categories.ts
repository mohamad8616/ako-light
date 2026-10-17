"use server";

import { requireAdminAccess } from "@/lib/admin/access";
import { deleteStorageUrls, removedUrls } from "@/lib/admin/storage-cleanup";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import { actionFail, actionOk, zodIssuesToFieldIssues, type ActionResult } from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import { materialCategoryFormSchema, type MaterialCategoryFormValues } from "@/lib/admin/schemas/material-category";
import {
  createMaterialCategory,
  deleteMaterialCategory,
  getMaterialCategoryImageUrls,
  getMaterialCategoryItemCount,
  materialCategorySlugTaken,
  updateMaterialCategory,
} from "@/lib/repositories/material-categories";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

export async function createMaterialCategoryAction(input: MaterialCategoryFormValues): Promise<ActionResult<string>> {
  await requireAdminAccess();
  const parsed = materialCategoryFormSchema.safeParse(input);
  if (!parsed.success) return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));

  try {
    if (await materialCategorySlugTaken(parsed.data.slug)) {
      return actionFail("invalid", [{ field: "slug", code: "slugTaken" }]);
    }
    const id = await createMaterialCategory(parsed.data);
    revalidateCatalog("materials");
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateMaterialCategoryAction(id: string, input: MaterialCategoryFormValues): Promise<ActionResult<undefined>> {
  await requireAdminAccess();
  const parsed = materialCategoryFormSchema.safeParse(input);
  if (!parsed.success) return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));

  try {
    if (await materialCategorySlugTaken(parsed.data.slug, id)) {
      return actionFail("invalid", [{ field: "slug", code: "slugTaken" }]);
    }
    const beforeUrls = await getMaterialCategoryImageUrls(id);
    await updateWithSlugHistory("materialCategory", id, parsed.data.slug, (tx) =>
      updateMaterialCategory(id, parsed.data, tx),
    );
    await deleteStorageUrls(removedUrls(beforeUrls, [parsed.data.image]));
    revalidateCatalog("materials");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyMaterialCategoryAction(id: string): Promise<ActionResult<undefined>> {
  await requireAdminAccess();
  try {
    if (await getMaterialCategoryItemCount(id)) return actionFail("inUse");
    const beforeUrls = await getMaterialCategoryImageUrls(id);
    await deleteMaterialCategory(id);
    await deleteStorageUrls(beforeUrls);
    revalidateCatalog("materials");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
