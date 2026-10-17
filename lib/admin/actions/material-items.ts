"use server";

import { requireAdminAccess } from "@/lib/admin/access";
import { deleteStorageUrls, removedUrls } from "@/lib/admin/storage-cleanup";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import { actionFail, actionOk, zodIssuesToFieldIssues, type ActionResult } from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import { materialItemFormSchema, type MaterialItemFormValues } from "@/lib/admin/schemas/material-item";
import {
  createMaterialItem,
  deleteMaterialItem,
  getMaterialItemImageUrls,
  materialItemSlugTaken,
  updateMaterialItem,
} from "@/lib/repositories/material-items";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

export async function createMaterialItemAction(input: MaterialItemFormValues): Promise<ActionResult<string>> {
  await requireAdminAccess();
  const parsed = materialItemFormSchema.safeParse(input);
  if (!parsed.success) return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));

  try {
    if (await materialItemSlugTaken(parsed.data.slug)) {
      return actionFail("invalid", [{ field: "slug", code: "slugTaken" }]);
    }
    const id = await createMaterialItem(parsed.data);
    revalidateCatalog("materialItems");
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateMaterialItemAction(id: string, input: MaterialItemFormValues): Promise<ActionResult<undefined>> {
  await requireAdminAccess();
  const parsed = materialItemFormSchema.safeParse(input);
  if (!parsed.success) return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));

  try {
    if (await materialItemSlugTaken(parsed.data.slug, id)) {
      return actionFail("invalid", [{ field: "slug", code: "slugTaken" }]);
    }
    const beforeUrls = await getMaterialItemImageUrls(id);
    await updateWithSlugHistory("material", id, parsed.data.slug, (tx) =>
      updateMaterialItem(id, parsed.data, tx),
    );
    await deleteStorageUrls(removedUrls(beforeUrls, [parsed.data.image]));
    revalidateCatalog("materialItems");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyMaterialItemAction(id: string): Promise<ActionResult<undefined>> {
  await requireAdminAccess();
  try {
    const beforeUrls = await getMaterialItemImageUrls(id);
    await deleteMaterialItem(id);
    await deleteStorageUrls(beforeUrls);
    revalidateCatalog("materialItems");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
