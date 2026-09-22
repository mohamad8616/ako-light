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
  updateFlagship,
} from "@/lib/repositories/flagships";

// TODO(slug-history): record the previous slug via recordSlugChange() before a
// rename lands (the redemption pass). Deferred on purpose: SlugHistory is
// @@unique([modelType, oldSlug]), so an A→B→A→B rename chain would throw until
// duplicate handling exists. The form warns that public URLs change instead.

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
    await updateFlagship(id, parsed.data);
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
    await deleteFlagship(id);
    revalidateCatalog("flagships");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
