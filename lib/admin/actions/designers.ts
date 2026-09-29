"use server";

/**
 * Server actions for the designers admin section.
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`. Deleting a designer only clears `Product.designerId`
 * (SetNull) — no products are removed.
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
  designerFormSchema,
  type DesignerFormValues,
} from "@/lib/admin/schemas/designer";
import {
  createDesigner,
  deleteDesigner,
  updateDesigner,
} from "@/lib/repositories/designers";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

/**
 * Renaming a designer records the old slug in `slug_history` so inbound links
 * to the previous URL 308-redirect to the current one. The history write and
 * the update share one transaction (see `updateWithSlugHistory`), so a failed
 * update never leaves an orphaned history row. When the slug is unchanged
 * nothing is recorded.
 */

export async function createDesignerAction(
  input: DesignerFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = designerFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createDesigner(parsed.data);
    revalidateCatalog("designers", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateDesignerAction(
  id: string,
  input: DesignerFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = designerFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateWithSlugHistory("designer", id, parsed.data.slug, (tx) =>
      updateDesigner(id, parsed.data, tx),
    );
    revalidateCatalog("designers", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyDesignerAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    await deleteDesigner(id);
    revalidateCatalog("designers");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
