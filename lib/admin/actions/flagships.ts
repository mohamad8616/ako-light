"use server";

/**
 * Server actions for the flagships admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`. `detail` is written as one nullable jsonb blob — switching
 * the form's detail toggle off writes SQL NULL (no detail page).
 */
import { requireAdminAccess } from "@/lib/admin/access";
import { deleteStorageUrls, removedUrls } from "@/lib/admin/storage-cleanup";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import {
  flagshipFormSchema,
  type FlagshipFormValues,
} from "@/lib/admin/schemas/flagship";
import {
  createFlagship,
  deleteFlagship,
  getFlagshipAdminDetail,
  updateFlagship,
} from "@/lib/repositories/flagships";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

/**
 * Renaming a flagship store records the old slug in `slug_history` so inbound
 * links to the previous URL 308-redirect to the current one. The history write
 * and the update share one transaction, so a failed update never leaves an
 * orphaned history row. An unchanged slug records nothing.
 */

/**
 * Every image URL a flagship row references: the card image plus, when the
 * store has a detail block, its hero, video thumbnail and gallery.
 *
 * Used to garbage-collect replaced uploads — see the cleanup note on
 * {@link updateFlagshipAction}.
 */
function flagshipImageUrls(values: {
  image: string;
  detail: { heroImage: string; video: { thumbnail: string }; gallery: string[] } | null;
}): string[] {
  const detail = values.detail;
  return [
    values.image,
    ...(detail
      ? [detail.heroImage, detail.video.thumbnail, ...detail.gallery]
      : []),
  ];
}

export async function createFlagshipAction(
  input: FlagshipFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = flagshipFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createFlagship(parsed.data);
    revalidateCatalog("flagships", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateFlagshipAction(
  id: string,
  input: FlagshipFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = flagshipFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    // Read before writing, delete after: an upload the admin replaced is only
    // garbage-collected once the new URL is safely persisted. Switching the
    // detail block off (detail -> null) drops its images too, which is exactly
    // "the row no longer references them".
    const previous = await getFlagshipAdminDetail(id);
    const beforeUrls = previous ? flagshipImageUrls(previous) : [];

    await updateWithSlugHistory("flagship", id, parsed.data.slug, (tx) =>
      updateFlagship(id, parsed.data, tx),
    );

    await deleteStorageUrls(
      removedUrls(beforeUrls, flagshipImageUrls(parsed.data)),
    );
    revalidateCatalog("flagships", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyFlagshipAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    const previous = await getFlagshipAdminDetail(id);
    const beforeUrls = previous ? flagshipImageUrls(previous) : [];

    await deleteFlagship(id);

    await deleteStorageUrls(beforeUrls);
    revalidateCatalog("flagships");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
