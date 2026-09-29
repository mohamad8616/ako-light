"use server";

/**
 * Server actions for the products admin section.
 *
 * Every action re-runs `requireAdminAccess()` (server functions are reachable
 * by direct POST, so re-authorization inside the action is mandatory — see the
 * bundled data-security guide), re-validates the payload with the SAME zod
 * schema the client form uses (client validation is never trusted), and maps
 * failures into the structured `ActionResult` contract. All persistence goes
 * through lib/repositories/products.ts — no Prisma calls here.
 */
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminAccess } from "@/lib/admin/access";
import { deleteBlobUrls, removedUrls } from "@/lib/admin/blob";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/lib/admin/schemas/product";
import {
  createProduct,
  deleteProduct,
  getProductAdminDetail,
  updateProduct,
} from "@/lib/repositories/products";
import { updateWithSlugHistory } from "@/lib/repositories/slug-history";

/**
 * Renaming a product records the old slug in `slug_history` so inbound links
 * to the previous URL 308-redirect to the current one. `updateProduct` already
 * opens its own transaction over the images/related rows; passing the shared
 * `tx` here keeps the history write atomic with that whole update, so a failed
 * write can never leave an orphaned history row. An unchanged slug records
 * nothing.
 */

/**
 * Every image URL a product row references: the two hero columns plus the
 * `product_images` rows and the denormalized `related` snapshots.
 *
 * Used to garbage-collect replaced uploads — see the cleanup note on
 * {@link updateProductAction}.
 */
function productImageUrls(values: {
  hoverImage: string;
  heroImage: string;
  images: { url: string }[];
  related: { image: string }[];
}): string[] {
  return [
    values.hoverImage,
    values.heroImage,
    ...values.images.map((image) => image.url),
    ...values.related.map((entry) => entry.image),
  ];
}

/** Creates a product (images included) and returns its new id. */
export async function createProductAction(
  input: ProductFormValues,
  db?: Prisma.TransactionClient,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    const id = await createProduct(parsed.data, db);
    revalidateCatalog("products", { id });
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateProductAction(
  id: string,
  input: ProductFormValues,
  db?: Prisma.TransactionClient,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  try {
    // Read the URLs BEFORE the write: an upload the admin replaced is still
    // referenced by the row at this point, and once the update lands the old
    // URL is gone from the database with no way to recover it.
    const previous = await getProductAdminDetail(id);
    const beforeUrls = previous ? productImageUrls(previous) : [];

    await updateWithSlugHistory(
      "product",
      id,
      parsed.data.slug,
      (tx) => updateProduct(id, parsed.data, tx),
      { db },
    );

    // AFTER the successful save only — deleting first would leave the row
    // pointing at a file that no longer exists if the update then failed.
    await deleteBlobUrls(
      removedUrls(beforeUrls, productImageUrls(parsed.data)),
    );

    revalidateCatalog("products", { id });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

export async function destroyProductAction(
  id: string,
  db?: Prisma.TransactionClient,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    // Same ordering as the update: capture the URLs, drop the row, then drop
    // the files it owned. A failed delete leaves the blobs referenced rather
    // than deleting files the database still points at.
    const previous = await getProductAdminDetail(id);
    const beforeUrls = previous ? productImageUrls(previous) : [];

    await deleteProduct(id, db);

    await deleteBlobUrls(beforeUrls);
    revalidateCatalog("products");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
