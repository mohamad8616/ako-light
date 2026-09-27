"use server";

/**
 * Server actions for the S34 page content section (myPlan.md Part D).
 *
 * Mirrors lib/admin/actions/about.ts: re-authorize, re-validate with the
 * section's own schema from the registry, persist through the repository, map
 * failures into `ActionResult`. The section key is checked against the registry
 * before it selects a schema, so an unknown key fails closed and a payload can
 * never be written under the wrong section's shape.
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
import { s34SectionSchemas } from "@/lib/admin/schemas/s34";
import type { S34SectionKey } from "@/lib/repositories/s34-page";
import { updateS34PageSection } from "@/lib/repositories/s34-page";

/** The registry is the single place that decides which keys are valid. */
function isS34SectionKey(value: string): value is S34SectionKey {
  return Object.prototype.hasOwnProperty.call(s34SectionSchemas, value);
}

/**
 * Saves one `/s34` section. `sectionKey` addresses the row; `input` is the
 * section's content shape, validated against that key's schema.
 */
export async function updateS34PageSectionAction(
  sectionKey: string,
  input: unknown,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  if (!isS34SectionKey(sectionKey)) {
    return actionFail("notFound");
  }

  const parsed = s34SectionSchemas[sectionKey].safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateS34PageSection(sectionKey, parsed.data);
    revalidateCatalog("s34");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}