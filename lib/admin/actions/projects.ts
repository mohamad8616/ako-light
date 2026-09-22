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
  updateProject,
} from "@/lib/repositories/projects";

// TODO(slug-history): record the previous slug via recordSlugChange() before a
// rename lands (the redemption pass). Deferred on purpose: SlugHistory is
// @@unique([modelType, oldSlug]), so an A→B→A→B rename chain would throw until
// duplicate handling exists. The form warns that public URLs change instead.

export async function createProjectAction(
  input: ProjectFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createProject(parsed.data);
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
    await updateProject(id, parsed.data);
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
    await deleteProject(id);
    revalidateCatalog("projects");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
