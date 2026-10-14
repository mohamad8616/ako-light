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
import { deleteStorageUrls, removedUrls } from "@/lib/admin/storage-cleanup";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import { clearableMediaRefSchema } from "@/lib/admin/schemas/common";
import { z } from "zod";
import {
  catalogueFeatureFormSchema,
  flagshipOneFeatureFormSchema,
  heroFeatureFormSchema,
  homeCollectionFeatureFormSchema,
  projectBannerFeatureFormSchema,
  projectDarkBackgroundFeatureFormSchema,
  videoFeatureFormSchema,
  type CatalogueFeatureFormValues,
  type FlagshipOneFeatureFormValues,
  type HeroFeatureFormValues,
  type HomeCollectionFeatureFormValues,
  type ProjectBannerFeatureFormValues,
  type ProjectDarkBackgroundFeatureFormValues,
  type VideoFeatureFormValues,
} from "@/lib/admin/schemas/homepage";
import type { Localized } from "@/lib/i18n/localized";
import {
  getCatalogueFeatureAdminDetail,
  getFlagshipOneFeatureAdminDetail,
  getHeroFeatureAdminDetail,
  getPageHeroMedia,
  updatePageHeroMedia,
  getHomeCollectionFeatureAdminDetail,
  getProjectBannerFeatureAdminDetail,
  getProjectDarkBackgroundFeatureAdminDetail,
  getVideoFeatureAdminDetail,
  updateCatalogueFeature,
  updateFlagshipOneFeature,
  updateHeroFeature,
  updateHomeCollectionFeature,
  updateProjectBannerFeature,
  updateProjectDarkBackgroundFeature,
  updateVideoFeature,
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
    // Read before writing, delete after: an upload the admin replaced is only
    // garbage-collected once the new URL is safely persisted. Clearing the
    // override ("" -> NULL) drops the old file too, which is correct — the row
    // no longer references it.
    const previous = await getFlagshipOneFeatureAdminDetail();
    const beforeUrls = previous?.image ? [previous.image] : [];
    const image = emptyToNull(parsed.data.image);

    await updateFlagshipOneFeature({
      enabled: parsed.data.enabled,
      mode: parsed.data.mode,
      flagshipId: parsed.data.flagshipId,
      kicker: clearedToNull(parsed.data.kicker),
      title: clearedToNull(parsed.data.title),
      paragraphs: listToNull(parsed.data.paragraphs),
      image,
    });

    await deleteStorageUrls(removedUrls(beforeUrls, [image]));
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
    const previous = await getProjectBannerFeatureAdminDetail();
    const beforeUrls = previous?.image ? [previous.image] : [];
    const image = emptyToNull(parsed.data.image);

    await updateProjectBannerFeature({
      enabled: parsed.data.enabled,
      mode: parsed.data.mode,
      projectId: parsed.data.projectId,
      kicker: clearedToNull(parsed.data.kicker),
      title: clearedToNull(parsed.data.title),
      image,
    });

    await deleteStorageUrls(removedUrls(beforeUrls, [image]));
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
    const previous = await getProjectDarkBackgroundFeatureAdminDetail();
    const beforeUrls = previous?.image ? [previous.image] : [];
    const image = emptyToNull(parsed.data.image);

    await updateProjectDarkBackgroundFeature({
      enabled: parsed.data.enabled,
      mode: parsed.data.mode,
      projectId: parsed.data.projectId,
      title: clearedToNull(parsed.data.title),
      paragraphs: listToNull(parsed.data.paragraphs),
      image,
    });

    await deleteStorageUrls(removedUrls(beforeUrls, [image]));
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
    const previous = await getHomeCollectionFeatureAdminDetail();
    const beforeUrls = previous?.image ? [previous.image] : [];

    await updateHomeCollectionFeature({
      enabled: parsed.data.enabled,
      image: parsed.data.image,
      title: parsed.data.title,
      text: parsed.data.text,
    });

    await deleteStorageUrls(
      removedUrls(beforeUrls, [parsed.data.image]),
    );
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
    const previous = await getCatalogueFeatureAdminDetail();
    const beforeUrls = previous?.image ? [previous.image] : [];

    // The uploaded PDF is the destination of record; a name without a URL is
    // meaningless, so the two columns are written together or not at all.
    const ctaPdfUrl = emptyToNull(parsed.data.ctaPdfUrl);
    const ctaPdfName = ctaPdfUrl
      ? emptyToNull(parsed.data.ctaPdfName)
      : null;

    await updateCatalogueFeature({
      enabled: parsed.data.enabled,
      catalogueItemId: parsed.data.catalogueItemId,
      image: parsed.data.image,
      paragraphs: listToNull(parsed.data.paragraphs),
      // An all-empty pair is "not configured" (SQL NULL), which is what makes
      // the default label come back. `emptyToNull` does the same for the URLs.
      ctaLabel: clearedToNull(parsed.data.ctaLabel),
      ctaHref: emptyToNull(parsed.data.ctaHref),
      ctaPdfUrl,
      ctaPdfName,
    });

    // Sweep the objects this edit DROPPED: a replaced section photo, and a
    // replaced or removed CTA pdf. `removedUrls` is order-insensitive and only
    // reports values that are genuinely gone, so a save that keeps either file
    // deletes nothing.
    await deleteStorageUrls([
      ...removedUrls(beforeUrls, [parsed.data.image]),
      ...removedUrls([previous?.ctaPdfUrl], [ctaPdfUrl]),
    ]);

    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

/**
 * Saves the hero (Pass D.1).
 *
 * ── Every field is an OVERRIDE, and clearing one is how you undo it ─────────
 *
 * The hero's content was never in the database: the copy is `hero.*`
 * dictionary strings, the media are static `/videos/*` assets, and the CTA
 * target is the component's own `/catalogue` default. So `""` / an empty pair
 * here means "go back to that built-in", which is mapped to SQL NULL — the same
 * contract the catalogue paragraph and CTA label already use. A save that
 * changes nothing therefore writes nothing but the row's existence and cannot
 * blank the hero.
 */
export async function updatePageHeroMediaAction(
  page: "about" | "s34",
  input: { videoUrl: string; posterUrl: string },
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = z
    .object({ videoUrl: clearableMediaRefSchema, posterUrl: clearableMediaRefSchema })
    .safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const previous = await getPageHeroMedia(page);
    const videoUrl = emptyToNull(parsed.data.videoUrl);
    const posterUrl = emptyToNull(parsed.data.posterUrl);
    await updatePageHeroMedia(page, { videoUrl, posterUrl });
    await deleteStorageUrls([
      ...removedUrls([previous.videoUrl], [videoUrl]),
      ...removedUrls([previous.posterUrl], [posterUrl]),
    ]);
    revalidateCatalog(page === "about" ? "about" : "s34");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateHeroFeatureAction(
  input: HeroFeatureFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = heroFeatureFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const previous = await getHeroFeatureAdminDetail();

    const videoUrl = emptyToNull(parsed.data.videoUrl);
    const posterUrl = emptyToNull(parsed.data.posterUrl);

    await updateHeroFeature({
      enabled: parsed.data.enabled,
      videoUrl,
      posterUrl,
      firstLine: clearedToNull(parsed.data.firstLine),
      secondLine: clearedToNull(parsed.data.secondLine),
      ctaLabel: clearedToNull(parsed.data.ctaLabel),
      ctaHref: emptyToNull(parsed.data.ctaHref),
    });

    // Sweep the objects this edit DROPPED. In practice this is a no-op — every
    // hero asset is a media-library object (an upload registers a Media row, and
    // the picker only ever returns one), and `deleteStorageUrls` deliberately
    // refuses to delete a media-owned key. It is kept for the same reason every
    // sibling slot keeps it: one safety net on the single shared path, rather
    // than each action reasoning about whether its own fields can be ours.
    await deleteStorageUrls([
      ...removedUrls([previous?.videoUrl], [videoUrl]),
      ...removedUrls([previous?.posterUrl], [posterUrl]),
    ]);

    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

/**
 * Saves the video section (Pass D.1).
 *
 * One field, and `""` means "no video": the stock fallback asset was deleted by
 * the operator (Pass D.1 follow-up), so clearing the field hides the section
 * rather than restoring a shipped film.
 */
export async function updateVideoFeatureAction(
  input: VideoFeatureFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = videoFeatureFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const previous = await getVideoFeatureAdminDetail();
    const videoUrl = emptyToNull(parsed.data.videoUrl);
    const posterUrl = emptyToNull(parsed.data.posterUrl);

    await updateVideoFeature({ enabled: parsed.data.enabled, videoUrl, posterUrl });

    await deleteStorageUrls([
      ...removedUrls([previous?.videoUrl], [videoUrl]),
      ...removedUrls([previous?.posterUrl], [posterUrl]),
    ]);

    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
