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
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

/**
 * Renaming a project records the old slug in `slug_history` so inbound links
 * to the previous URL 308-redirect to the current one. The history write and
 * the update share one transaction, so a failed update never leaves an
 * orphaned history row. An unchanged slug records nothing.
 */

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
    await updateWithSlugHistory("project", id, parsed.data.slug, (tx) =>
      updateProject(id, parsed.data, tx),
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
    await deleteProject(id);
    revalidateCatalog("projects");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
