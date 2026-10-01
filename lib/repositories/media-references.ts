/**
 * "Who points at this media object?" — the reference check that guards deletion.
 *
 * WHY THIS EXISTS AND WHY IT IS SHAPED LIKE THIS
 *
 * Pass 13.5C has not yet migrated the catalog to reference `Media` rows. Every
 * catalog image column today holds a **bare URL string**, so there is no foreign
 * key to follow and `onDelete: Restrict` cannot protect anything. Deleting a
 * `Media` row whose URL is pasted into a product would therefore silently break
 * the live site — the row would be gone while the catalog kept pointing at it.
 *
 * The check below closes that hole WITHOUT inventing the migration the plan
 * forbids: it asks each known image-bearing column whether it holds this URL.
 * When 13.5C lands, most of these probes become FKs and this module shrinks;
 * until then it is the only thing standing between an admin and a broken page.
 *
 * WHAT IT CANNOT SEE (kept explicit so nothing pretends otherwise)
 *
 * Three areas store image references inside `jsonb`, where a `contains` on a
 * nested key is not expressible without raw SQL that would break on the next
 * schema change:
 *
 *   - `Flagship.detail` (heroImage / video / gallery)
 *   - `AboutPageSection.content`
 *   - `S34PageSection.content`
 *
 * They are listed in {@link UNCHECKABLE_REFERENCE_AREAS} rather than quietly
 * omitted, so the deletion path can be described honestly.
 *
 * SERVER-ONLY: reaches the Prisma client.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/** One place that points at the object. */
export interface MediaReference {
  /** Human-readable location, e.g. `product.heroImage`. */
  area: string;
  /** How many rows in that location point at the object. */
  count: number;
}

/**
 * Areas holding image references this module cannot query.
 *
 * Exported so the refusal message and the docs can be accurate about the
 * boundary of the check instead of implying it is exhaustive.
 */
export const UNCHECKABLE_REFERENCE_AREAS: readonly string[] = [
  "flagship.detail (jsonb: heroImage / video / gallery)",
  "aboutPageSection.content (jsonb)",
  "s34PageSection.content (jsonb)",
];

interface ReferenceProbe {
  area: string;
  count: (url: string, db: Prisma.TransactionClient) => Promise<number>;
}

/**
 * Every column that can hold a media URL, as one count each.
 *
 * Ordered roughly by how likely a hit is, so a referenced object usually
 * reports its most relevant location first.
 *
 * `orderItem.image` is included even though it is an immutable snapshot: the
 * whole point of that column is that a past order keeps showing what was
 * bought, so deleting the object behind it would rewrite history.
 *
 * `user.image` is included because an admin avatar is set to a URL like any
 * other field.
 */
const PROBES: readonly ReferenceProbe[] = [
  {
    area: "product.heroImage",
    count: (url, db) => db.product.count({ where: { heroImage: url } }),
  },
  {
    area: "product.hoverImage",
    count: (url, db) => db.product.count({ where: { hoverImage: url } }),
  },
  {
    area: "productImage.url",
    count: (url, db) => db.productImage.count({ where: { url } }),
  },
  {
    area: "designer.image",
    count: (url, db) => db.designer.count({ where: { image: url } }),
  },
  {
    area: "collection.image",
    count: (url, db) => db.collection.count({ where: { image: url } }),
  },
  {
    area: "material.image",
    count: (url, db) => db.material.count({ where: { image: url } }),
  },
  {
    area: "flagship.image",
    count: (url, db) => db.flagship.count({ where: { image: url } }),
  },
  {
    area: "project.image",
    count: (url, db) => db.project.count({ where: { image: url } }),
  },
  {
    area: "project.portfolioImages",
    count: (url, db) =>
      db.project.count({ where: { portfolioImages: { has: url } } }),
  },
  {
    area: "orderItem.image",
    count: (url, db) => db.orderItem.count({ where: { image: url } }),
  },
  {
    area: "user.image",
    count: (url, db) => db.user.count({ where: { image: url } }),
  },
  {
    area: "flagshipOneFeature.image",
    count: (url, db) => db.flagshipOneFeature.count({ where: { image: url } }),
  },
  {
    area: "projectBannerFeature.image",
    count: (url, db) =>
      db.projectBannerFeature.count({ where: { image: url } }),
  },
  {
    area: "projectDarkBackgroundFeature.image",
    count: (url, db) =>
      db.projectDarkBackgroundFeature.count({ where: { image: url } }),
  },
  {
    area: "homeCollectionFeature.image",
    count: (url, db) =>
      db.homeCollectionFeature.count({ where: { image: url } }),
  },
  {
    area: "catalogueFeature.image",
    count: (url, db) => db.catalogueFeature.count({ where: { image: url } }),
  },
];

/**
 * Every location that currently points at `url`, with a row count each.
 *
 * Returns `[]` for an unreferenced object, which is the common case and the
 * only one that permits deletion.
 *
 * The probes run SEQUENTIALLY, and deliberately so. They are independent, so
 * `Promise.all` would be faster — but this project's remote pooler is the
 * scarce resource (see tests/helpers/tx.ts), and firing sixteen counts at once
 * to answer one boolean is exactly the pattern that has produced
 * connection-pressure flakes here. A delete is a rare, user-initiated action,
 * so a handful of sequential round trips is the right trade.
 *
 * Every probe runs even after a hit is found: knowing ALL the places an asset
 * is used is what makes the refusal actionable ("it is in three projects and an
 * order") rather than just a "no".
 *
 * `db` accepts a transaction client, the standard seam in this layer, so the
 * whole check can be exercised inside a rolled-back test transaction.
 */
export async function findMediaReferences(
  url: string,
  db: Prisma.TransactionClient = prisma,
): Promise<MediaReference[]> {
  if (!url) return [];

  const found: MediaReference[] = [];
  for (const probe of PROBES) {
    const count = await probe.count(url, db);
    if (count > 0) found.push({ area: probe.area, count });
  }
  return found;
}
