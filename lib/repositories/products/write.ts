import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { asJsonInput, asNullableJsonInput } from "../casting";

/**
 * Product writes.
 *
 * Every function takes an optional `db` client so a caller inside an existing
 * transaction (the test suites pass a rolled-back one) keeps working: when a
 * client is supplied the work runs on it directly, and only the default
 * `prisma` client opens a transaction of its own — which is what keeps the row
 * and its images atomic for real callers.
 */

export type ProductWriteInput = {
  slug: string;
  name: Localized;
  hoverImage: string;
  heroImage: string;
  /**
   * Pass 13.5C Media links. Optional so every existing caller (tests, the
   * seeder, the slug-history suite) keeps compiling and behaves exactly as
   * before — absent means "no Media link", which is the correct default for a
   * row that was never attached to the library.
   */
  heroMediaId?: string | null;
  hoverMediaId?: string | null;
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
    /** Optional for the same reason as the hero/hover ids above. */
    mediaId?: string | null;
  }[];
};

export const createProduct = async (
  input: ProductWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<string> => {
  // A caller-supplied client (the test suite passes its rolled-back
  // transaction) is already transactional — run on it directly. The default
  // client opens its own transaction so row + images stay atomic.
  const run = async (tx: Prisma.TransactionClient) => {
    const created = await tx.product.create({
      data: {
        id: input.slug,
        slug: input.slug,
        name: asJsonInput(input.name),
        hoverImage: input.hoverImage,
        // Pass 13.5C: the relationship alongside the URL. `?? null` because the
        // field is optional on the input type — an absent link is a real NULL.
        hoverMediaId: input.hoverMediaId ?? null,
        priceEur: input.priceEur,
        priceToman: input.priceToman,
        existsInStore: input.existsInStore,
        quantity: input.quantity,
        heroImage: input.heroImage,
        heroMediaId: input.heroMediaId ?? null,
        description: asJsonInput(input.description),
        // Optional jsonb: real SQL NULL when the product has no extra info block.
        moreInfo: asNullableJsonInput(input.moreInfo),
        downloads: asJsonInput(input.downloads),
        related: asJsonInput(input.related),
        sortOrder: input.sortOrder,
        categoryId: input.categoryId,
        designerId: input.designerId,
      },
    });

    if (input.images.length > 0) {
      await tx.productImage.createMany({
        data: input.images.map((image, index) => ({
          id: image.id ?? crypto.randomUUID(),
          productId: created.id,
          url: image.url,
          mediaId: image.mediaId ?? null,
          alt: image.alt ?? null,
          isPrimary: image.isPrimary,
          sortOrder: index,
        })),
      });
    }

    return created;
  };

  const row = db === prisma ? await prisma.$transaction(run) : await run(db);
  return row.id;
};

export const updateProduct = async (
  id: string,
  input: ProductWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const run = async (tx: Prisma.TransactionClient) => {
    await tx.product.update({
      where: { id },
      data: {
        slug: input.slug,
        name: asJsonInput(input.name),
        hoverImage: input.hoverImage,
        hoverMediaId: input.hoverMediaId ?? null,
        priceEur: input.priceEur,
        priceToman: input.priceToman,
        existsInStore: input.existsInStore,
        quantity: input.quantity,
        heroImage: input.heroImage,
        heroMediaId: input.heroMediaId ?? null,
        description: asJsonInput(input.description),
        // Optional jsonb: real SQL NULL when the product has no extra info block.
        moreInfo: asNullableJsonInput(input.moreInfo),
        downloads: asJsonInput(input.downloads),
        related: asJsonInput(input.related),
        sortOrder: input.sortOrder,
        categoryId: input.categoryId,
        designerId: input.designerId,
      },
    });

    const existing = await tx.productImage.findMany({
      where: { productId: id },
    });
    const nextIds = new Set(
      input.images.filter((image) => image.id).map((image) => image.id!),
    );

    const toDelete = existing.filter((image) => !nextIds.has(image.id));
    if (toDelete.length > 0) {
      await tx.productImage.deleteMany({
        where: { id: { in: toDelete.map((image) => image.id) } },
      });
    }

    for (const [index, image] of input.images.entries()) {
      if (image.id) {
        await tx.productImage.update({
          where: { id: image.id },
          data: {
            url: image.url,
            // Re-derived on every save, so clearing an image's Media link in
            // the picker actually clears it here too.
            mediaId: image.mediaId ?? null,
            alt: image.alt ?? null,
            isPrimary: image.isPrimary,
            sortOrder: index,
          },
        });
      } else {
        await tx.productImage.create({
          data: {
            id: crypto.randomUUID(),
            productId: id,
            url: image.url,
            mediaId: image.mediaId ?? null,
            alt: image.alt ?? null,
            isPrimary: image.isPrimary,
            sortOrder: index,
          },
        });
      }
    }
  };

  if (db === prisma) {
    await prisma.$transaction(run);
  } else {
    await run(db);
  }
};

export const deleteProduct = async (
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  await db.product.delete({ where: { id } });
};
