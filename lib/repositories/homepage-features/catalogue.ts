import { cache } from "react";
import { type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { safePdfFilename } from "@/lib/media/pdf-sniff";
import { asNullableJsonInput, asOptionalLocalized } from "../casting";
import { asOptionalLocalizedList } from "./resolve";
import { CATALOGUE_SLOT } from "./slots";

/**
 * The same-origin route that streams an uploaded CTA PDF as a DOWNLOAD.
 *
 * The CTA must not point straight at the stored object: the Liara CDN serves it
 * as `application/pdf`, which browsers render INLINE in their PDF viewer rather
 * than downloading. This route re-serves the object with
 * `Content-Disposition: attachment`, which is the only thing that reliably
 * starts a download (the `download` attribute is ignored cross-origin).
 *
 * Deliberately NOT locale-prefixed: it is an API route, and the middleware
 * matcher excludes `/api` from the locale rewrite.
 */
export const CATALOGUE_CTA_DOWNLOAD_PATH = "/api/catalogue/cta";

/** components/home/CatalogueSection.tsx — title/PDF come from CatalogueItem. */
export type ResolvedCatalogueFeature = {
  enabled: boolean;
  /** `CatalogueItem.title`, e.g. "S34/5". */
  title: string;
  /**
   * Where the CTA points, resolved HERE because every candidate is plain data.
   *
   * Priority: an UPLOADED pdf (which routes through
   * {@link CATALOGUE_CTA_DOWNLOAD_PATH} so the download actually starts), then
   * the slot's own `ctaHref`, then `CatalogueItem.href`.
   */
  downloadHref: string;
  /**
   * The filename to save the download as — non-null ONLY when the destination
   * is an uploaded PDF.
   *
   * This is the component's signal that the CTA must be a plain anchor carrying
   * `download`, rather than a locale-aware link: a link to `/api/...` would be
   * rewritten to `/fa/api/...` by the locale router and 404. It therefore has
   * to be derived from the FILE, never from the name column: `ctaPdfName` is
   * allowed to be empty, and keying the signal off it would silently turn a
   * working download back into that 404. `safePdfFilename` supplies a neutral
   * name in that case (and guarantees a `.pdf` suffix and header safety).
   */
  downloadName: string | null;
  /** Section photo (the slot owns it: CatalogueItem has no image column). */
  image: string;
  /**
   * The section's paragraph blocks, edited in the admin panel.
   *
   * EMPTY is a valid answer and means "use the static `catalogue.description`
   * translation" — the component owns that fallback, because the dictionary is
   * a client concern. That is also why the column is nullable: every row that
   * existed before this field was added keeps its copy with no backfill.
   */
  paragraphs: Localized[];
  /**
   * The CTA's own localized label, or null when not configured.
   *
   * The DEFAULT is `t("catalogue.download") + title`, which is a dictionary
   * string — so, like the paragraph fallback, it is composed in the component
   * rather than here.
   */
  ctaLabel: Localized | null;
};

/** Columns of the Catalogue slot as the admin form submits them. */
export type CatalogueFeatureWriteInput = {
  enabled: boolean;
  /** CatalogueItem.id */
  catalogueItemId: string;
  image: string;
  paragraphs: Localized[] | null;
  ctaLabel: Localized | null;
  /** A single shared URL (this project keeps one address per link). */
  ctaHref: string | null;
  /** An uploaded PDF's public URL — takes precedence over `ctaHref`. */
  ctaPdfUrl: string | null;
  /** The uploaded PDF's presentable filename, for the download header. */
  ctaPdfName: string | null;
};

/** The catalogue section takes its title and PDF href from the linked item. */
export const getCatalogueFeature = cache(
  async (): Promise<ResolvedCatalogueFeature | null> => {
    const row = await prisma.catalogueFeature.findUnique({
      where: { id: CATALOGUE_SLOT },
      include: { catalogueItem: true },
    });
    if (!row) return null;

    // An uploaded FILE outranks a pasted address: it is the more specific
    // instruction, and the operator can see the file they chose. Below that the
    // slot's own link wins over the linked item's, so a row saved before any of
    // these columns existed behaves exactly as it always did.
    const uploaded = row.ctaPdfUrl;

    return {
      enabled: row.enabled,
      title: row.catalogueItem.title,
      // An uploaded file is addressed through the SAME-ORIGIN download route,
      // never by its storage URL. That is the whole reason the route exists:
      // the CDN serves `application/pdf`, which a browser renders INLINE, and
      // the `download` attribute is ignored for a cross-origin href — so
      // pointing the CTA at the storage URL would silently stop downloading.
      // The route re-serves the object with `Content-Disposition: attachment`.
      downloadHref: uploaded
        ? CATALOGUE_CTA_DOWNLOAD_PATH
        : (row.ctaHref ?? row.catalogueItem.href),
      downloadName: uploaded ? safePdfFilename(row.ctaPdfName) : null,
      image: row.image,
      paragraphs: asOptionalLocalizedList(row.paragraphs) ?? [],
      ctaLabel: asOptionalLocalized(row.ctaLabel) ?? null,
    };
  },
);

/**
 * The uploaded CTA pdf, read UNCACHED — `{ url, name }`, or `null` when the
 * slot has no uploaded file.
 *
 * Deliberately NOT wrapped in `cache()` like its siblings: it is consumed by a
 * Route Handler, not by a React render, where a per-request React cache is
 * meaningless. Selecting two columns also avoids dragging the whole resolved
 * slot — and its `CatalogueItem` join — into a file download.
 */
export const getCatalogueCtaPdf = async (): Promise<{
  url: string;
  name: string;
} | null> => {
  const row = await prisma.catalogueFeature.findUnique({
    where: { id: CATALOGUE_SLOT },
    select: { ctaPdfUrl: true, ctaPdfName: true },
  });
  if (!row?.ctaPdfUrl) return null;
  return { url: row.ctaPdfUrl, name: row.ctaPdfName ?? "" };
};

/** The Catalogue slot as the admin form edits it, `null` when missing. */
export const getCatalogueFeatureAdminDetail = cache(
  async (): Promise<CatalogueFeatureWriteInput | null> => {
    const row = await prisma.catalogueFeature.findUnique({
      where: { id: CATALOGUE_SLOT },
    });
    if (!row) return null;

    return {
      enabled: row.enabled,
      catalogueItemId: row.catalogueItemId,
      image: row.image,
      paragraphs: asOptionalLocalizedList(row.paragraphs),
      ctaLabel: asOptionalLocalized(row.ctaLabel) ?? null,
      ctaHref: row.ctaHref,
      ctaPdfUrl: row.ctaPdfUrl,
      ctaPdfName: row.ctaPdfName,
    };
  },
);

/** Saves the Catalogue slot (singleton upsert, see flagship-one.ts). */
export const updateCatalogueFeature = async (
  input: CatalogueFeatureWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const data = {
    enabled: input.enabled,
    catalogueItemId: input.catalogueItemId,
    image: input.image,
    paragraphs: asNullableJsonInput(input.paragraphs),
    ctaLabel: asNullableJsonInput(input.ctaLabel),
    ctaHref: input.ctaHref,
    ctaPdfUrl: input.ctaPdfUrl,
    ctaPdfName: input.ctaPdfName,
  };

  await db.catalogueFeature.upsert({
    where: { id: CATALOGUE_SLOT },
    create: { id: CATALOGUE_SLOT, ...data },
    update: data,
  });
};
