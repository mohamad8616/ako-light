"use server";

/**
 * Pass 13.5D — server actions for global site settings and social links.
 *
 * Same contract as every admin action module: `requireAdminAccess()` FIRST
 * (server functions are reachable by direct POST, so the client form is never
 * the authorization), then validate with the SAME zod schema the form uses,
 * then persist through the repository — no Prisma calls here.
 *
 * Every mutation is ADMIN/OWNER only. A `USER` is redirected before any of the
 * work below happens, and the redirection is the framework's own signal rather
 * than a returned error, so there is no "denied" state for a client to ignore.
 */
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin/access";
import { revalidateSiteSettings } from "@/lib/admin/revalidate";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
  type AdminFieldIssue,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import {
  siteSettingsFormSchema,
  socialLinkFormSchema,
  socialLinkIdSchema,
  type SiteSettingsFormValues,
  type SocialLinkFormValues,
} from "@/lib/admin/schemas/site-settings";
import { prisma } from "@/lib/db/prisma";
import {
  createSocialLink,
  deleteSocialLink,
  reorderSocialLinks,
  updateSocialLink,
  upsertSiteSettings,
} from "@/lib/repositories/site-settings";

/**
 * Creates or updates the singleton settings row.
 *
 * The two Media ids are verified against the database before being stored. A
 * client-supplied Media id is a claim like any other input: a stale picker
 * value or a forged id would otherwise become a dangling brand asset that
 * renders as a broken image on every page.
 */
export async function updateSiteSettingsAction(
  input: SiteSettingsFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = siteSettingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const issues: AdminFieldIssue[] = [];
    if (parsed.data.logoMediaId && !(await mediaExists(parsed.data.logoMediaId))) {
      issues.push({ field: "logoMediaId", code: "notFound" });
    }
    if (
      parsed.data.faviconMediaId &&
      !(await mediaExists(parsed.data.faviconMediaId))
    ) {
      issues.push({ field: "faviconMediaId", code: "notFound" });
    }
    if (issues.length > 0) return actionFail("invalid", issues);

    await upsertSiteSettings(parsed.data);
    revalidateSiteSettings();
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

function mediaExists(id: string): Promise<{ id: string } | null> {
  return prisma.media.findUnique({ where: { id }, select: { id: true } });
}

/** Adds a social link. */
export async function createSocialLinkAction(
  input: SocialLinkFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = socialLinkFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const row = await createSocialLink(parsed.data);
    revalidateSiteSettings();
    return actionOk(row.id);
  } catch (error) {
    return toActionResult(error);
  }
}

/** Patches an existing link (label, url, platform, ordering, visibility). */
export async function updateSocialLinkAction(
  id: string,
  input: Partial<SocialLinkFormValues>,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const idParsed = socialLinkIdSchema.safeParse(id);
  if (!idParsed.success) {
    return actionFail("invalid", [{ field: "id", code: "invalid" }]);
  }

  const parsed = socialLinkFormSchema.partial().safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    await updateSocialLink(idParsed.data, parsed.data);
    revalidateSiteSettings();
    return actionOk(undefined);
  } catch (error) {
    // P2025 (unknown id) -> notFound, via the shared mapping.
    return toActionResult(error);
  }
}

/** Removes a link entirely. */
export async function destroySocialLinkAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const idParsed = socialLinkIdSchema.safeParse(id);
  if (!idParsed.success) {
    return actionFail("invalid", [{ field: "id", code: "invalid" }]);
  }

  try {
    await deleteSocialLink(idParsed.data);
    revalidateSiteSettings();
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

/**
 * Rewrites display order from an ordered list of ids.
 *
 * The list itself is validated (ids only, no arbitrary values) because it
 * drives N updates; an unvalidated array would let a caller pass anything.
 */
export async function reorderSocialLinksAction(
  ids: readonly string[],
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = z.array(socialLinkIdSchema).safeParse(ids);
  if (!parsed.success) {
    return actionFail("invalid");
  }

  try {
    await reorderSocialLinks(parsed.data);
    revalidateSiteSettings();
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
