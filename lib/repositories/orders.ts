/**
 * Order reads — Prisma-backed for the admin dashboard.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import {
  checkFulfillmentTransition,
  type FulfillmentStatus,
  type TransitionRefusal,
} from "@/lib/orders/lifecycle";
import { cache } from "react";
import { asLocalized } from "./casting";

/**
 * Transaction budget for the guarded writes in this module.
 *
 * Prisma's default `maxWait` is 2000 ms and the remote Neon pooler regularly
 * exceeds it on a cold connection, producing "Unable to start a transaction in
 * the given time" — which reads like an application bug and is not one. The
 * database-backed TEST tiers share the same rationale in
 * `@/tests/helpers/tx` (which must stay test-only, so production cannot import
 * it); this is the production-side counterpart.
 */
const ORDER_TX_OPTIONS = { maxWait: 30_000, timeout: 30_000 } as const;

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

/**
 * Updates an order's fulfillment status — but only along a legal edge of the
 * lifecycle (lib/orders/lifecycle.ts).
 *
 * This used to be a plain `prisma.order.update`, which let an admin walk an
 * order BACKWARDS (`delivered → unfulfilled`), skip straight to `delivered`, or
 * start preparing goods nobody had paid for. The rules now live in
 * `checkFulfillmentTransition`, and they are enforced here rather than in the
 * admin form because a server action is reachable by direct POST.
 *
 * Two guarantees, mirroring `claimPendingOrder`:
 *
 *   1. **The current state is re-read inside the transaction**, never taken
 *      from the caller — so a client cannot claim an order is in a state that
 *      permits the move it wants.
 *   2. **The write re-asserts the state it validated.** The `updateMany`'s
 *      WHERE pins the exact `fulfillmentStatus`/`status` pair the check ran
 *      against, so a concurrent transition (another admin, or the payment
 *      callback settling the order mid-flight) makes this match 0 rows and the
 *      move is refused instead of clobbering the newer state.
 *
 * Payment status is deliberately NOT writable here — `Order.status` is written
 * only by ZarinPal's callback, so no dashboard action can mark an order paid.
 *
 * @throws {InvalidOrderTransitionError} when the move is not allowed.
 */
export const updateOrderFulfillmentStatus = async (
  id: string,
  fulfillmentStatus: FulfillmentStatus,
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      select: { status: true, fulfillmentStatus: true },
    });

    if (!order) {
      throw new InvalidOrderTransitionError("notFound", null, fulfillmentStatus);
    }

    const from = order.fulfillmentStatus;
    const check = checkFulfillmentTransition(
      from,
      fulfillmentStatus,
      order.status,
    );

    if (!check.ok) {
      throw new InvalidOrderTransitionError(check.reason, from, fulfillmentStatus);
    }

    // Same-state submit (a double-clicked form): nothing to write.
    if (!check.changed) return;

    const updated = await tx.order.updateMany({
      where: {
        id,
        // Pins the state the check ran against — see (2) above.
        fulfillmentStatus: from,
        status: order.status,
      },
      data: { fulfillmentStatus },
    });

    if (updated.count === 0) {
      throw new InvalidOrderTransitionError(
        "notAllowed",
        from,
        fulfillmentStatus,
      );
    }
  }, ORDER_TX_OPTIONS);
};

/**
 * A fulfillment move the lifecycle does not permit.
 *
 * Thrown rather than returned so the repository keeps the project's existing
 * contract (throw; `toActionResult` maps), and so the ~60 existing callers and
 * the admin-action tests that mock this function keep working unchanged.
 */
export class InvalidOrderTransitionError extends Error {
  constructor(
    readonly reason: TransitionRefusal | "notFound",
    readonly from: FulfillmentStatus | null,
    readonly to: FulfillmentStatus,
  ) {
    super(`Invalid order fulfillment transition: ${from ?? "?"} -> ${to} (${reason})`);
    this.name = "InvalidOrderTransitionError";
  }
}

// ---------------------------------------------------------------------------
// Customer-facing reads (Pass 15)
//
// OWNERSHIP IS ENFORCED BY THE QUERY, not by the caller and never by anything
// the browser sends. Both functions take the authenticated `userId` resolved
// from the session on the server, and both put it in the `where` clause — so a
// request for someone else's order matches no row. There is no "fetch then
// check" step that a future refactor could drop.
//
// The projections are deliberately NARROW. `zarinpalAuthority`, `zarinpalRefId`
// and `idempotencyKey` are payment-internal and are not selected at all, so they
// cannot leak into a customer response even by accident. `getMyOrder` returns
// null for BOTH "no such order" and "not yours", so the caller cannot tell the
// difference and cannot probe for the existence of other people's orders.
// ---------------------------------------------------------------------------

export interface CustomerOrderSummary {
  id: string;
  createdAt: string;
  /** Payment state — written only by the gateway callback. */
  status: string;
  /** Fulfilment state — the shop's progress. */
  fulfillmentStatus: string;
  /** Order total in Toman. */
  totalAmount: number;
  currency: string;
  itemCount: number;
  /** The first line's snapshot image, for a list thumbnail. */
  previewImage: string | null;
}

export interface CustomerOrderLine {
  id: string;
  /** Null once the product has been deleted — the line is still history. */
  productId: string | null;
  /** Current slug, for a "view product" link. Null if the product is gone. */
  productSlug: string | null;
  /** Snapshot taken at purchase — never the product's current name. */
  name: Localized;
  /** Snapshot taken at purchase. */
  image: string;
  quantity: number;
  /** Toman, snapshot. */
  unitPriceAtPurchase: number;
  /** `unitPriceAtPurchase * quantity`, computed here so the UI cannot drift. */
  lineTotal: number;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  items: CustomerOrderLine[];
}

const customerOrderSelect = {
  id: true,
  createdAt: true,
  status: true,
  fulfillmentStatus: true,
  totalAmount: true,
  currency: true,
  // Shipping details the customer entered — theirs to see. Payment internals
  // (zarinpalAuthority / zarinpalRefId) and idempotencyKey are NOT selected.
  recipientName: true,
  phone: true,
  addressLine: true,
  city: true,
  postalCode: true,
  items: {
    select: {
      id: true,
      productId: true,
      name: true,
      image: true,
      quantity: true,
      unitPriceAtPurchase: true,
      product: { select: { slug: true } },
    },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.OrderSelect;

type CustomerOrderRow = Prisma.OrderGetPayload<{
  select: typeof customerOrderSelect;
}>;

function toCustomerOrderSummary(row: CustomerOrderRow): CustomerOrderSummary {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    fulfillmentStatus: row.fulfillmentStatus,
    totalAmount: row.totalAmount.toNumber(),
    currency: row.currency,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    previewImage: row.items[0]?.image ?? null,
  };
}

function toCustomerOrderDetail(row: CustomerOrderRow): CustomerOrderDetail {
  const items: CustomerOrderLine[] = row.items.map((item) => {
    const unit = item.unitPriceAtPurchase.toNumber();
    return {
      id: item.id,
      productId: item.productId,
      productSlug: item.product?.slug ?? null,
      name: asLocalized(item.name),
      image: item.image,
      quantity: item.quantity,
      unitPriceAtPurchase: unit,
      // Integer Toman on both sides, so this stays exact.
      lineTotal: unit * item.quantity,
    };
  });

  return {
    ...toCustomerOrderSummary(row),
    recipientName: row.recipientName,
    phone: row.phone,
    addressLine: row.addressLine,
    city: row.city,
    postalCode: row.postalCode,
    items,
  };
}

/**
 * Every order belonging to `userId`, newest first.
 *
 * The secondary `id` sort makes the order TOTAL: `createdAt` is not unique, so
 * two orders placed in the same millisecond would otherwise come back in an
 * arbitrary (and potentially different) order between calls.
 */
export const getMyOrders = cache(
  async (userId: string): Promise<CustomerOrderSummary[]> => {
    const rows = await prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: customerOrderSelect,
    });

    return rows.map(toCustomerOrderSummary);
  },
);

/**
 * One order, but only if it belongs to `userId`.
 *
 * Returns `null` when the order does not exist AND when it belongs to someone
 * else — the caller must not be able to distinguish the two.
 */
export const getMyOrder = cache(
  async (userId: string, orderId: string): Promise<CustomerOrderDetail | null> => {
    const row = await prisma.order.findFirst({
      // `userId` is part of the lookup, not a post-hoc check.
      where: { id: orderId, userId },
      select: customerOrderSelect,
    });

    return row ? toCustomerOrderDetail(row) : null;
  },
);

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
// until something releases it. `releaseOrderStock` is that path;
// lib/orders/stale-cleanup.ts runs a bounded daily sweep of old pending rows.
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
 * Called from `claimPendingOrder` for:
 *   - a checkout callback returning a non-success status (`status !== "OK"`);
 *   - a verification that ZarinPal definitively rejected;
 *   - the bounded stale-pending sweep (lib/orders/stale-cleanup.ts).
 * A late successful payment after the sweep has released stock may still
 * repair failed -> paid in the existing callback; gateway reconciliation of
 * that case remains Pass 14.5, NOT an inventory-cron responsibility.
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
  /**
   * Cleanup only: even if the scan saw this order earlier, the FINAL guarded
   * update must still see it as older than this cutoff and unfulfilled.
   * Never supplied by payment callbacks; their existing behaviour is unchanged.
   */
  staleBefore?: Date;
}): Promise<{ changed: boolean }> {
  const { orderId, status, zarinpalRefId, txOptions, staleBefore } = params;
  if (staleBefore && status !== "failed") {
    throw new Error("A stale-order cutoff can only guard a failure transition");
  }

  return prisma.$transaction(async (tx) => {
    const settled = await tx.order.updateMany({
      where: {
        id: orderId,
        // `paid` is accepted from ANY status so a real payment can always be
        // recorded — including correcting a wrongly-failed order. `failed` is
        // accepted only while the order is still pending, so it cannot undo a
        // confirmed payment.
        status: status === "paid" ? { not: "paid" } : "pending",
        ...(staleBefore
          ? { createdAt: { lt: staleBefore }, fulfillmentStatus: "unfulfilled" as const }
          : {}),
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

