"use server";

/**
 * Server actions for the collections admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`. `description` is written as one {p1,p2,p3} jsonb value.
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
  collectionFormSchema,
  type CollectionFormValues,
} from "@/lib/admin/schemas/collection";
import {
  createCollection,
  deleteCollection,
  updateCollection,
} from "@/lib/repositories/collections";

// TODO(slug-history): record the previous slug via recordSlugChange() before a
// rename lands (the redemption pass). Deferred on purpose: SlugHistory is
// @@unique([modelType, oldSlug]), so an A→B→A→B rename chain would throw until
// duplicate handling exists. The form warns that public URLs change instead.

export async function createCollectionAction(
  input: CollectionFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = collectionFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createCollection(parsed.data);
    revalidateCatalog("collections", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateCollectionAction(
  id: string,
  input: CollectionFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = collectionFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateCollection(id, parsed.data);
    revalidateCatalog("collections", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyCollectionAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    await deleteCollection(id);
    revalidateCatalog("collections");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
