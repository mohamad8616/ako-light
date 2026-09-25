"use server";

/**
 * Server actions for the homepage admin section (myPlan.md Part D).
 *
 * Same contract as every admin action module: re-authorize, re-validate with
 * the form's zod schema, persist through the repository, map failures into
 * `ActionResult`.
 *
 * Every homepage slot is a SINGLETON configuration row (addressed by a stable
 * id — see prisma/seed.ts), so there is no create and no delete: each action
 * saves the one row the hub lists. The three clearable-override schemas arrive
 * with empty pairs/lists for the fields the admin left blank; this module maps
 * those to SQL NULL, which is exactly "not overridden" — the banner then reads
 * that field off its linked entity again.
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
  catalogueFeatureFormSchema,
  flagshipOneFeatureFormSchema,
  homeCollectionFeatureFormSchema,
  projectBannerFeatureFormSchema,
  projectDarkBackgroundFeatureFormSchema,
  type CatalogueFeatureFormValues,
  type FlagshipOneFeatureFormValues,
  type HomeCollectionFeatureFormValues,
  type ProjectBannerFeatureFormValues,
  type ProjectDarkBackgroundFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import type { Localized } from "@/lib/i18n/localized";
import {
  updateCatalogueFeature,
  updateFlagshipOneFeature,
  updateHomeCollectionFeature,
  updateProjectBannerFeature,
  updateProjectDarkBackgroundFeature,
} from "@/lib/repositories/homepage-features";

/**
 * "Both languages empty" means the admin cleared the override → SQL NULL.
 * Anything else is written as submitted, so a half-filled pair (which the
 * schema already rejects) can never reach the row.
 */
function clearedToNull(value: Localized): Localized | null {
  return value.en === "" && value.fa === ""
    ? null
    : { en: value.en, fa: value.fa };
}

/** An empty image override means "not overridden" → SQL NULL. */
function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

/** An emptied paragraph list means "not overridden" → SQL NULL. */
function listToNull(value: Localized[]): Localized[] | null {
  return value.length === 0 ? null : value;
}

export async function updateFlagshipOneFeatureAction(
  input: FlagshipOneFeatureFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = flagshipOneFeatureFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateFlagshipOneFeature({
      enabled: parsed.data.enabled,
      mode: parsed.data.mode,
      flagshipId: parsed.data.flagshipId,
      kicker: clearedToNull(parsed.data.kicker),
      title: clearedToNull(parsed.data.title),
      paragraphs: listToNull(parsed.data.paragraphs),
      image: emptyToNull(parsed.data.image),
    });
    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateProjectBannerFeatureAction(
  input: ProjectBannerFeatureFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = projectBannerFeatureFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateProjectBannerFeature({
      enabled: parsed.data.enabled,
      mode: parsed.data.mode,
      projectId: parsed.data.projectId,
      kicker: clearedToNull(parsed.data.kicker),
      title: clearedToNull(parsed.data.title),
      image: emptyToNull(parsed.data.image),
    });
    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateProjectDarkBackgroundFeatureAction(
  input: ProjectDarkBackgroundFeatureFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = projectDarkBackgroundFeatureFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateProjectDarkBackgroundFeature({
      enabled: parsed.data.enabled,
      mode: parsed.data.mode,
      projectId: parsed.data.projectId,
      title: clearedToNull(parsed.data.title),
      paragraphs: listToNull(parsed.data.paragraphs),
      image: emptyToNull(parsed.data.image),
    });
    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateHomeCollectionFeatureAction(
  input: HomeCollectionFeatureFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = homeCollectionFeatureFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateHomeCollectionFeature({
      enabled: parsed.data.enabled,
      image: parsed.data.image,
      title: parsed.data.title,
      text: parsed.data.text,
    });
    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateCatalogueFeatureAction(
  input: CatalogueFeatureFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = catalogueFeatureFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateCatalogueFeature({
      enabled: parsed.data.enabled,
      catalogueItemId: parsed.data.catalogueItemId,
      image: parsed.data.image,
    });
    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
