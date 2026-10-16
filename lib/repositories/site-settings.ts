import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import {
  asJson,
  asJsonInput,
  asNullableJsonInput,
} from "@/lib/repositories/casting";

/**
 * Pass 13.5D — global site settings and social links.
 *
 * SERVER-ONLY (reaches the Prisma client), same rule as every repository.
 *
 * Two things shape this module:
 *
 *   - **Settings are a singleton.** There is one website, so reads resolve one
 *     row and writes upsert on a fixed id — a second row can never appear, and
 *     `getSiteSettings()` returns `null` (never throws) when the row has not
 *     been created yet. Every consumer treats `null` as "use the fallback",
 *     which is what keeps a fresh database rendering without a seed.
 *   - **Brand assets are resolved through Media, not stored as URLs.** The DTO
 *     exposes `logoUrl`/`faviconUrl`, derived from the related `Media` row at
 *     read time. No blob URL, filename or storage key is ever written here.
 *
 * Reads are wrapped in React `cache()`, the project's standard request-scoped
 * de-duplication, so the navbar, the footer and `generateMetadata` share ONE
 * query per request instead of three.
 */

/** The one settings row (see the model note in prisma/schema.prisma). */
export const SITE_SETTINGS_ID = "singleton";

/** What the public site and the admin both read. */
export interface SiteSettingsDto {
  id: string;
  siteName: Localized;
  siteDescription: Localized;
  /** Resolved from the related Media row; null when unset or when the Media
   *  row was deleted (the FK is SetNull). */
  logoUrl: string | null;
  faviconUrl: string | null;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  phone: string | null;
  email: string | null;
  address: Localized | null;
  /**
   * The product page's catalogue block. Every field is nullable and null means
   * "use the component's built-in fallback", exactly like the brand assets —
   * so an un-edited row renders the same copy it always did.
   */
  catalogueTitle: Localized | null;
  catalogueText: Localized | null;
  /** The CTA button's label; null = the dictionary's default label. */
  catalogueCtaLabel: Localized | null;
  /** Resolved cover image URL (Media relation); null = bundled default. */
  catalogueUrl: string | null;
  catalogueMediaId: string | null;
  /** The CTA / cover link target. null = dictionary-driven default. */
  catalogueHref: string | null;
  /** Presentable filename of the CTA document; null when none chosen. */
  catalogueName: string | null;
  updatedAt: string;
}

export interface SocialLinkDto {
  id: string;
  /** Machine key the frontend maps to an icon. */
  platform: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
}

const SETTINGS_SELECT = {
  id: true,
  siteName: true,
  siteDescription: true,
  logoMediaId: true,
  faviconMediaId: true,
  phone: true,
  email: true,
  address: true,
  catalogueTitle: true,
  catalogueText: true,
  catalogueCtaLabel: true,
  catalogueMediaId: true,
  catalogueHref: true,
  catalogueName: true,
  updatedAt: true,
  logoMedia: { select: { url: true } },
  faviconMedia: { select: { url: true } },
  catalogueMedia: { select: { url: true } },
} satisfies Prisma.SiteSettingsSelect;

/** A settings row after {@link SETTINGS_SELECT} has been applied. */
type SiteSettingsRow = Prisma.SiteSettingsGetPayload<{
  select: typeof SETTINGS_SELECT;
}>;

/**
 * Row → DTO, in ONE place.
 *
 * Read and upsert used to inline the same twelve-field object literal, so every
 * new column had to be added twice. Both now go through this.
 */
function toSiteSettingsDto(row: SiteSettingsRow): SiteSettingsDto {
  return {
    id: row.id,
    siteName: asJson<Localized>(row.siteName),
    siteDescription: asJson<Localized>(row.siteDescription),
    logoUrl: row.logoMedia?.url ?? null,
    faviconUrl: row.faviconMedia?.url ?? null,
    logoMediaId: row.logoMediaId,
    faviconMediaId: row.faviconMediaId,
    phone: row.phone,
    email: row.email,
    address: row.address === null ? null : asJson<Localized>(row.address),
    catalogueTitle: optionalLocalized(row.catalogueTitle),
    catalogueText: optionalLocalized(row.catalogueText),
    catalogueCtaLabel: optionalLocalized(row.catalogueCtaLabel),
    catalogueUrl: row.catalogueMedia?.url ?? null,
    catalogueMediaId: row.catalogueMediaId,
    catalogueHref: row.catalogueHref,
    catalogueName: row.catalogueName,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** jsonb -> Localized | null. A missing/blank pair stays null (= "use default"). */
function optionalLocalized(value: Prisma.JsonValue | null): Localized | null {
  if (value === null) return null;
  const parsed = asJson<Localized>(value);
  return parsed.en?.trim() === "" && parsed.fa?.trim() === ""
    ? null
    : parsed;
}

const SOCIAL_SELECT = {
  id: true,
  platform: true,
  label: true,
  url: true,
  sortOrder: true,
  isActive: true,
} satisfies Prisma.SocialLinkSelect;

/** jsonb -> Localized. The column is written as `{ en, fa }` by every path. */


/**
 * The global settings row, or null when it has not been created yet.
 *
 * Null is a legitimate state, not an error: the site falls back to its
 * hardcoded wordmark, static favicon and default metadata.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettingsDto | null> => {
  const row = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
    select: SETTINGS_SELECT,
  });
  if (!row) return null;

  return toSiteSettingsDto(row);
});

/**
 * Active social links, in display order — what the footer renders.
 *
 * Only `isActive` rows: disabling a link in the admin is the way to hide it
 * without losing it.
 */
export const getActiveSocialLinks = cache(async (): Promise<SocialLinkDto[]> => {
  const rows = await prisma.socialLink.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: SOCIAL_SELECT,
  });
  return rows.map(toSocialLinkDto);
});

/** Every link including inactive ones — the admin list. */
export const getSocialLinks = cache(async (): Promise<SocialLinkDto[]> => {
  const rows = await prisma.socialLink.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: SOCIAL_SELECT,
  });
  return rows.map(toSocialLinkDto);
});

function toSocialLinkDto(row: {
  id: string;
  platform: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
}): SocialLinkDto {
  return {
    id: row.id,
    platform: row.platform,
    label: row.label,
    url: row.url,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

/** What a settings write persists. */
export interface SiteSettingsWriteInput {
  siteName: Localized;
  siteDescription: Localized;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  phone: string | null;
  email: string | null;
  address: Localized | null;
  /** Product-page catalogue block; null = keep using the component fallback. */
  catalogueTitle: Localized | null;
  catalogueText: Localized | null;
  catalogueCtaLabel: Localized | null;
  catalogueMediaId: string | null;
  catalogueHref: string | null;
  catalogueName: string | null;
}

/**
 * Creates or replaces the singleton row.
 *
 * An upsert rather than create+update: the row may not exist on a fresh
 * database, and a plain update would silently no-op. `db` accepts a transaction
 * client — the standard seam in this layer.
 */
export async function upsertSiteSettings(
  input: SiteSettingsWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<SiteSettingsDto> {
  const row = await db.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: {
      id: SITE_SETTINGS_ID,
      siteName: asJsonInput(input.siteName),
      siteDescription: asJsonInput(input.siteDescription),
      logoMediaId: input.logoMediaId,
      faviconMediaId: input.faviconMediaId,
      phone: input.phone,
      email: input.email,
      address: asNullableJsonInput(input.address),
      catalogueTitle: asNullableJsonInput(input.catalogueTitle),
      catalogueText: asNullableJsonInput(input.catalogueText),
      catalogueCtaLabel: asNullableJsonInput(input.catalogueCtaLabel),
      catalogueMediaId: input.catalogueMediaId,
      catalogueHref: input.catalogueHref,
      catalogueName: input.catalogueName,
    },
    update: {
      siteName: asJsonInput(input.siteName),
      siteDescription: asJsonInput(input.siteDescription),
      logoMediaId: input.logoMediaId,
      faviconMediaId: input.faviconMediaId,
      phone: input.phone,
      email: input.email,
      address: asNullableJsonInput(input.address),
      catalogueTitle: asNullableJsonInput(input.catalogueTitle),
      catalogueText: asNullableJsonInput(input.catalogueText),
      catalogueCtaLabel: asNullableJsonInput(input.catalogueCtaLabel),
      catalogueMediaId: input.catalogueMediaId,
      catalogueHref: input.catalogueHref,
      catalogueName: input.catalogueName,
    },
    select: SETTINGS_SELECT,
  });

  return toSiteSettingsDto(row);
}

export interface SocialLinkWriteInput {
  platform: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
}

export async function createSocialLink(
  input: SocialLinkWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<SocialLinkDto> {
  const row = await db.socialLink.create({
    data: { ...input },
    select: SOCIAL_SELECT,
  });
  return toSocialLinkDto(row);
}

/**
 * Patches one link; only the supplied keys are written.
 *
 * Throws Prisma's P2025 for an unknown id — the action layer maps that to the
 * shared `notFound` code, exactly like every other repository.
 */
export async function updateSocialLink(
  id: string,
  patch: Partial<SocialLinkWriteInput>,
  db: Prisma.TransactionClient = prisma,
): Promise<SocialLinkDto> {
  const row = await db.socialLink.update({
    where: { id },
    data: patch,
    select: SOCIAL_SELECT,
  });
  return toSocialLinkDto(row);
}

export async function deleteSocialLink(
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> {
  await db.socialLink.delete({ where: { id } });
}

/**
 * Rewrites display order from an ordered list of ids.
 *
 * Each write is a guarded update (`where: { id }`), so an id that no longer
 * exists is reported rather than silently corrupting the sequence.
 */
export async function reorderSocialLinks(
  ids: readonly string[],
  db: Prisma.TransactionClient = prisma,
): Promise<void> {
  for (const [index, id] of ids.entries()) {
    await db.socialLink.update({
      where: { id },
      data: { sortOrder: index },
    });
  }
}
