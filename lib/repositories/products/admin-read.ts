import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { MEDIA_URL_SELECT, resolveMediaUrl } from "@/lib/media/resolve";
import {
  asDownloadLinks,
  asLocalized,
  asOptionalLocalized,
  asRelatedProducts,
} from "../casting";

/**
 * Admin product reads — the list row and the full edit DTO.
 *
 * Kept apart from `./read` because these are the shapes the dashboard table and
 * the edit form consume, and they intentionally expose columns the public
 * `Product` type does not (ids, raw counts, unresolved Media relationship ids).
 */

export type ProductAdminRow = {
  id: string;
  slug: string;
  name: Localized;
  categoryId: string;
  categoryName: Localized;
  designerId?: string | null;
  designerName?: Localized | null;
  priceEur: number;
  priceToman: number;
  existsInStore: boolean;
  quantity: number;
  sortOrder: number;
  imageCount: number;
};

export type ProductAdminDetail = {
  id: string;
  slug: string;
  name: Localized;
  /** Resolved for display: the Media URL when linked, else the legacy column. */
  hoverImage: string;
  heroImage: string;
  /**
   * The Media RELATIONSHIP ids (Pass 13.5C). Distinct from the urls above: the
   * admin form edits a url, and the server derives the id from it, so these are
   * what the picker highlights as "already attached".
   */
  heroMediaId: string | null;
  hoverMediaId: string | null;
  priceEur: number;
  priceToman: number;
  existsInStore: boolean;
  quantity: number;
  description: Localized;
  moreInfo?: Localized | null;
  downloads: { label: Localized; href: string }[];
  related: { name: Localized; slug: string; category: string; image: string }[];
  sortOrder: number;
  categoryId: string;
  designerId: string | null;
  images: {
    id?: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
    /** Pass 13.5C — the linked Media row, when this image has one. */
    mediaId: string | null;
  }[];
};

export const getProductAdminRows = cache(
  async (): Promise<ProductAdminRow[]> => {
    const rows = await prisma.product.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        category: true,
        designer: true,
        _count: { select: { productImages: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: asLocalized(row.name),
      categoryId: row.categoryId,
      categoryName: asLocalized(row.category.name),
      designerId: row.designerId,
      designerName: row.designer ? asLocalized(row.designer.name) : null,
      priceEur: row.priceEur.toNumber(),
      priceToman: row.priceToman.toNumber(),
      existsInStore: row.existsInStore,
      quantity: row.quantity,
      sortOrder: row.sortOrder,
      imageCount: row._count.productImages,
    }));
  },
);

export const getProductAdminDetail = cache(
  async (id: string): Promise<ProductAdminDetail | null> => {
    const row = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        designer: true,
        heroMedia: MEDIA_URL_SELECT,
        hoverMedia: MEDIA_URL_SELECT,
        productImages: {
          orderBy: { sortOrder: "asc" },
          include: { media: MEDIA_URL_SELECT },
        },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      name: asLocalized(row.name),
      hoverImage: resolveMediaUrl(row.hoverMedia, row.hoverImage),
      heroImage: resolveMediaUrl(row.heroMedia, row.heroImage),
      heroMediaId: row.heroMediaId,
      hoverMediaId: row.hoverMediaId,
      priceEur: row.priceEur.toNumber(),
      priceToman: row.priceToman.toNumber(),
      existsInStore: row.existsInStore,
      quantity: row.quantity,
      description: asLocalized(row.description),
      moreInfo: asOptionalLocalized(row.moreInfo),
      downloads: asDownloadLinks(row.downloads),
      related: asRelatedProducts(row.related),
      sortOrder: row.sortOrder,
      categoryId: row.categoryId,
      designerId: row.designerId,
      images: row.productImages.map((image) => ({
        id: image.id,
        url: resolveMediaUrl(image.media, image.url),
        alt: image.alt,
        isPrimary: image.isPrimary,
        mediaId: image.mediaId,
      })),
    };
  },
);
