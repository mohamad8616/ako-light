/**
 * Order reads — Prisma-backed for the admin dashboard.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { cache } from "react";
import { asLocalized } from "./casting";

const orderInclude = {
  user: true,
  items: {
    include: { product: { select: { name: true, slug: true } } },
  },
} satisfies Prisma.OrderInclude;

export type OrderRow = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export type OrderAdminRow = {
  id: string;
  slug: string;
  userId: string;
  userName: string;
  userEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  fulfillmentStatus: string;
  createdAt: string;
  itemCount: number;
};

export type OrderAdminDetail = {
  id: string;
  slug: string;
  userId: string;
  userName: string;
  userEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  fulfillmentStatus: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  zarinpalAuthority: string | null;
  zarinpalRefId: string | null;
  createdAt: string;
  updatedAt: string;
  items: {
    id: string;
    productId: string | null;
    productName: Localized | null;
    productSlug: string | null;
    quantity: number;
    unitPriceAtPurchase: number;
    name: Localized;
    image: string;
  }[];
};

export const getOrderAdminRows = cache(
  async (): Promise<OrderAdminRow[]> => {
    const rows = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: orderInclude,
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.id,
      userId: row.userId,
      userName: row.user.name,
      userEmail: row.user.email,
      totalAmount: row.totalAmount.toNumber(),
      currency: row.currency,
      status: row.status,
      fulfillmentStatus: row.fulfillmentStatus,
      createdAt: row.createdAt.toISOString(),
      itemCount: row.items.length,
    }));
  },
);

export const getOrderAdminDetail = cache(
  async (id: string): Promise<OrderAdminDetail | null> => {
    const row = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!row) return null;

    return {
      id: row.id,
      slug: row.id,
      userId: row.userId,
      userName: row.user.name,
      userEmail: row.user.email,
      totalAmount: row.totalAmount.toNumber(),
      currency: row.currency,
      status: row.status,
      fulfillmentStatus: row.fulfillmentStatus,
      recipientName: row.recipientName,
      phone: row.phone,
      addressLine: row.addressLine,
      city: row.city,
      postalCode: row.postalCode,
      zarinpalAuthority: row.zarinpalAuthority,
      zarinpalRefId: row.zarinpalRefId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      items: row.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product ? asLocalized(item.product.name) : null,
        productSlug: item.product?.slug ?? null,
        quantity: item.quantity,
        unitPriceAtPurchase: item.unitPriceAtPurchase.toNumber(),
        name: asLocalized(item.name),
        image: item.image,
      })),
    };
  },
);

export const updateOrderFulfillmentStatus = async (
  id: string,
  fulfillmentStatus: "unfulfilled" | "shipped" | "delivered" | "cancelled",
): Promise<void> => {
  await prisma.order.update({
    where: { id },
    data: { fulfillmentStatus },
  });
};

// ---------------------------------------------------------------------------
// Stock reservation
//
// Ordering a unit and paying for it are not the same instant: the customer
// leaves for the ZarinPal page and comes back. Stock therefore has to be
// claimed when the order is CREATED, not when it is paid — otherwise two
// customers can both pay for the same last unit, and the second one discovers
// the problem only after the money has moved.
//
// Claiming at creation means an order that is never paid holds its reservation
// until something releases it. `releaseOrderStock` is that path; a sweep for
// stale `pending` orders is the remaining work (see the note on
// `releaseOrderStock`).
//
// Both functions take a transaction client so they compose into the caller's
// atomic unit. They are intentionally NOT wrapped in their own transaction: the
// order row and the stock movement must commit or roll back together.
// ---------------------------------------------------------------------------

/**
 * Atomically decrements each product's stock, failing the whole claim if any
 * line cannot be satisfied.
 *
 * The availability rule lives in the WHERE clause, so the read and the write
 * cannot be interleaved: two concurrent claims for the last unit both target
 * the same row, and Postgres serializes the two UPDATEs — the first decrements
 * it to 0, the second then matches 0 rows and is reported as unavailable. A
 * read-then-write check (`product.quantity < quantity` followed by a separate
 * update) does NOT give this guarantee: both transactions would read the same
 * pre-decrement quantity and both would pass.
 *
 * Does not throw on insufficient stock — it returns the slugs that could not be
 * satisfied so the caller can decide. Throwing from here would work, but the
 * caller already has a translated error path for a partial failure and needs
 * the list of offending items to report them.
 *
 * @param items  `{ productId, quantity }` — one entry per distinct product,
 *               quantities already summed. `quantity` must be >= 1.
 * @param tx     Transaction client. Required: a claim that is not part of the
 *               order's transaction could commit while the order fails.
 * @returns      `{ claimedIds, unavailable }` — ids that were decremented (all
 *               of them when `unavailable` is empty) and the slugs that could
 *               not be satisfied.
 */
export async function claimProductStock(
  items: { productId: string; quantity: number }[],
  tx: Prisma.TransactionClient,
): Promise<{ claimedIds: string[]; unavailable: string[] }> {
  const claimedIds: string[] = [];
  const unavailable: string[] = [];

  for (const { productId, quantity } of items) {
    // The row is read for its slug (the human handle used in the error) and to
    // distinguish "gone" from "not purchasable"; the DECISION, however, is
    // made by the guarded update below, never by this read.
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true, existsInStore: true, priceToman: true },
    });

    if (!product) {
      // A deleted product is reported by its raw id — there is no slug left.
      unavailable.push(productId);
      continue;
    }
    if (!product.existsInStore || product.priceToman.toNumber() <= 0) {
      unavailable.push(product.slug);
      continue;
    }

    const claimed = await tx.product.updateMany({
      where: {
        id: productId,
        // Re-asserted here, not merely read above: between the read and this
        // update an admin can flip the product out of stock.
        existsInStore: true,
        quantity: { gte: quantity },
      },
      data: { quantity: { decrement: quantity } },
    });

    if (claimed.count === 0) {
      unavailable.push(product.slug);
      continue;
    }

    claimedIds.push(product.id);
  }

  return { claimedIds, unavailable };
}

/**
 * Returns a claimed quantity to stock, used when an order that reserved stock
 * is cancelled or abandoned.
 *
 * Idempotency is the caller's responsibility: nothing here records that a
 * release already happened, so calling it twice double-credits the inventory.
 * Drive it from a status transition that can only occur once — that is exactly
 * what `claimPendingOrder` does, by releasing only when its guarded
 * `pending → failed` update actually matched a row.
 *
 * Called from `claimPendingOrder`, which covers the two paths that matter:
 *   - a checkout callback returning a non-success status (`status !== "OK"`);
 *   - a verification that ZarinPal definitively rejected.
 *
 * Still NOT covered — a `pending` order the customer abandons on the ZarinPal
 * page never reaches a callback at all, so its reservation is held forever.
 * That needs a sweep over `pending` orders older than some cutoff, and is the
 * remaining follow-up to this work.
 */
export async function releaseOrderStock(
  orderId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, quantity: true },
  });

  for (const item of items) {
    // A null productId means the product was deleted after the order was
    // placed (OrderItem keeps the line as a historical record) — there is no
    // row left to credit.
    if (!item.productId) continue;

    const restored = await tx.product.updateMany({
      where: { id: item.productId },
      data: { quantity: { increment: item.quantity } },
    });

    // The product row is gone: nothing to restore, and not an error — the
    // order's own history is unaffected.
    if (restored.count === 0) continue;
  }
}

/**
 * Settles a `pending` order to a terminal status, atomically.
 *
 * This is the ONLY place a callback should write `paid`/`failed`, because it
 * makes three separate guarantees that a plain `prisma.order.update` does not:
 *
 *   1. **One-way, guarded transition.** The WHERE clause admits a row only
 *      while it is `pending`, so two concurrent callbacks — a customer
 *      double-clicking, a browser retry, or ZarinPal's own callback retry —
 *      cannot both act on the same transition. The loser matches 0 rows, sees
 *      `changed: false`, and sends no duplicate receipt.
 *
 *   2. **`failed` is a repair, not a downgrade.** A verified payment is the
 *      truth, so `paid` may ALWAYS be written: in particular it overwrites a
 *      previously mis-recorded `"failed"`. That is the recovery path for orders
 *      damaged before the gateway-fault classification existed (see
 *      lib/payments/zarinpal.ts). `failed`, by contrast, is only ever written
 *      from `pending` — it can never clobber a `paid` order.
 *
 *   3. **Stock is released with the failure.** A `pending → failed` transition
 *      returns the reservation made at checkout (`claimProductStock`), which
 *      closes the reservation leak for orders the customer abandons or that the
 *      gateway declines. Release runs INSIDE this transaction so the status and
 *      the stock movement commit together; and because the status update is
 *      guarded, a re-delivered failure callback releases nothing a second time.
 *
 * @returns whether the status actually changed. Callers use it to gate
 *          side-effects that must happen once (the order receipt).
 *
 * @param txOptions Optional Prisma transaction options. The default `maxWait`
 *   is 2 s, which a cold connection to the remote dev pooler can exceed — so a
 *   caller that deliberately runs several of these concurrently (a test, or a
 *   reconciliation sweep) should raise it rather than see an opaque
 *   "Unable to start a transaction in the given time".
 */
export async function claimPendingOrder(params: {
  orderId: string;
  status: "paid" | "failed";
  /** ZarinPal's reference id. Recorded only when there is one. */
  zarinpalRefId?: string | null;
  /** Overrides for the internal transaction's `maxWait`/`timeout`. */
  txOptions?: { maxWait?: number; timeout?: number };
}): Promise<{ changed: boolean }> {
  const { orderId, status, zarinpalRefId, txOptions } = params;

  return prisma.$transaction(async (tx) => {
    const settled = await tx.order.updateMany({
      where: {
        id: orderId,
        // `paid` is accepted from ANY status so a real payment can always be
        // recorded — including correcting a wrongly-failed order. `failed` is
        // accepted only while the order is still pending, so it cannot undo a
        // confirmed payment.
        status: status === "paid" ? { not: "paid" } : "pending",
      },
      data: {
        status,
        updatedAt: new Date(),
        ...(zarinpalRefId ? { zarinpalRefId } : {}),
      },
    });

    if (settled.count === 0) return { changed: false };

    // Only a transition INTO failed frees the reservation. A transition to paid
    // keeps it — the goods are owed.
    if (status === "failed") {
      await releaseOrderStock(orderId, tx);
    }

    return { changed: true };
  }, txOptions);
}

