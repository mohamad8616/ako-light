"use server";

/**
 * Server actions for the projects admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`. The ordered `productIds` list is synced with the
 * project_product join table inside the same transaction as the project row.
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
  projectFormSchema,
  type ProjectFormValues,
} from "@/lib/admin/schemas/project";
import {
  createProject,
  deleteProject,
  getProjectAdminDetail,
  updateProject,
  type ProjectWriteInput,
} from "@/lib/repositories/projects";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

/**
 * Renaming a project records the old slug in `slug_history` so inbound links
 * to the previous URL 308-redirect to the current one. The history write and
 * the update share one transaction, so a failed update never leaves an
 * orphaned history row. An unchanged slug records nothing.
 */

/**
 * Every image URL a project row references: the hero column, the gallery, and
 * the two portfolio-section overrides.
 *
 * Used to garbage-collect replaced uploads — see the cleanup note on
 * {@link updateProjectAction}. Without it, every image the operator swaps out in
 * the dashboard stays in the bucket forever, referenced by nothing. The section
 * overrides are included for exactly that reason: they became upload targets
 * with the rest of the media fields, so a replaced one is a real orphan.
 *
 * Empty strings are harmless here: `removedUrls` drops falsy values and
 * `deleteStorageUrls` derives no key from "".
 */
function projectImageUrls(values: {
  image: string;
  portfolioImages: string[];
  textImageUrl: string;
  fullImageUrl: string;
}): string[] {
  return [
    values.image,
    ...values.portfolioImages,
    values.textImageUrl,
    values.fullImageUrl,
  ];
}

/**
 * Supplies the `i18nKey` the form no longer asks for.
 *
 * The column is a leftover from when a project's copy lived in the translation
 * dictionary under `projects.<key>.*`. Since the copy moved into real columns
 * (`name`, `description`, `paragraph`, …) NOTHING reads it: the public page and
 * every component render the columns, and the dictionary has no
 * `projects.<key>.*` entries at all. So the admin stopped asking, and the value
 * is derived here instead.
 *
 * The column is still NOT NULL, so a value must be written:
 *
 *   - CREATE derives it from the slug (`projects.<slug>`), which keeps it
 *     deterministic and self-consistent with the row's own URL;
 *   - UPDATE carries the row's EXISTING value straight through, so saving a
 *     project never rewrites a byte of data it does not own.
 */
function withI18nKey(
  values: ProjectFormValues,
  previous: ProjectWriteInput | null,
): ProjectWriteInput {
  return {
    ...values,
    i18nKey: previous?.i18nKey ?? `projects.${values.slug}`,
  };
}

export async function createProjectAction(
  input: ProjectFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createProject(withI18nKey(parsed.data, null));
    revalidateCatalog("projects", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateProjectAction(
  id: string,
  input: ProjectFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    // Read the URLs BEFORE the write: an upload the admin replaced is still
    // referenced by the row at this point, and once the update lands the old
    // URL is gone from the database with no way to recover it.
    const previous = await getProjectAdminDetail(id);
    const beforeUrls = previous ? projectImageUrls(previous) : [];

    await updateWithSlugHistory("project", id, parsed.data.slug, (tx) =>
      updateProject(id, withI18nKey(parsed.data, previous), tx),
    );

    // AFTER the successful save only — deleting first would leave the row
    // pointing at a file that no longer exists if the update then failed.
    await deleteStorageUrls(
      removedUrls(beforeUrls, projectImageUrls(parsed.data)),
    );

    revalidateCatalog("projects", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyProjectAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    // Same ordering as the update: capture the URLs, drop the row, then drop the
    // files it owned. A failed delete leaves the blobs referenced rather than
    // deleting files the database still points at.
    const previous = await getProjectAdminDetail(id);
    const beforeUrls = previous ? projectImageUrls(previous) : [];

    await deleteProject(id);

    await deleteStorageUrls(beforeUrls);
    revalidateCatalog("projects");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
