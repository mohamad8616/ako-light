"use server";

/**
 * Server actions for the collections admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`. `description` is written as one {p1,p2,p3} jsonb value.
 */
import { requireAdminAccess } from "@/lib/admin/access";
import { deleteBlobUrls, removedUrls } from "@/lib/admin/blob";
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
  getCollectionAdminDetail,
  updateCollection,
} from "@/lib/repositories/collections";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

/**
 * Renaming a collection records the old slug in `slug_history` so inbound
 * links to the previous URL 308-redirect to the current one. The history write
 * and the update share one transaction, so a failed update never leaves an
 * orphaned history row. An unchanged slug records nothing.
 */

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
    // Read before writing, delete after: an upload the admin replaced is only
    // garbage-collected once the new URL is safely persisted.
    const previous = await getCollectionAdminDetail(id);
    const beforeUrls = previous ? [previous.image] : [];

    await updateWithSlugHistory("collection", id, parsed.data.slug, (tx) =>
      updateCollection(id, parsed.data, tx),
    );

    await deleteBlobUrls(removedUrls(beforeUrls, [parsed.data.image]));
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
    const previous = await getCollectionAdminDetail(id);
    const beforeUrls = previous ? [previous.image] : [];

    await deleteCollection(id);

    await deleteBlobUrls(beforeUrls);
    revalidateCatalog("collections");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
