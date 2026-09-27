"use server";

/**
 * Server actions for the About page content section (myPlan.md Part D).
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`.
 *
 * One action for the whole page rather than one per section: the section key
 * arrives as an argument, is checked against the schema registry (which
 * `satisfies` the repository's key union), and then selects BOTH the payload
 * rules and the row to write. A client can therefore never aim a payload at a
 * section whose shape it does not match, and an unknown key fails closed.
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
import { aboutSectionSchemas } from "@/lib/admin/schemas/about";
import type { AboutSectionKey } from "@/lib/repositories/about-page";
import { updateAboutPageSection } from "@/lib/repositories/about-page";

/** The registry is the single place that decides which keys are valid. */
function isAboutSectionKey(value: string): value is AboutSectionKey {
  return Object.prototype.hasOwnProperty.call(aboutSectionSchemas, value);
}

/**
 * Saves one `/about` section. `sectionKey` addresses the row; `input` is the
 * section's content shape, validated against that key's schema.
 */
export async function updateAboutPageSectionAction(
  sectionKey: string,
  input: unknown,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  if (!isAboutSectionKey(sectionKey)) {
    return actionFail("notFound");
  }

  const parsed = aboutSectionSchemas[sectionKey].safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateAboutPageSection(sectionKey, parsed.data);
    revalidateCatalog("about");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}