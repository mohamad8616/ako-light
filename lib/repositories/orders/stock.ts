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
import type { Prisma } from "@/generated/prisma/client";

/**
 * A product row already read by the caller, for the columns a claim decision
 * needs. Passing these in avoids re-reading the same row inside the claim.
 */
export type ClaimableProduct = {
  id: string;
  slug: string;
  existsInStore: boolean;
  priceToman: { toNumber(): number };
};

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
 * PERFORMANCE — PASS 8
 * --------------------
 * The guarded `updateMany` is the DECISION and must run once per line; that is
 * irreducible. What was reducible is the `findUnique` that used to precede it:
 * the checkout action had already read the very same rows, so the claim was
 * re-reading one row per line purely to fetch `slug`/`existsInStore`/
 * `priceToman` for the error message. Against a remote pooler (~320 ms RTT) that
 * duplicated a round trip per line for zero extra information.
 *
 * A caller that already holds the rows passes `known`; the claim then skips the
 * read entirely and works from that data. A caller that does NOT (the
 * settlement re-reservation path) omits it and the read happens as before — so
 * this is additive and no caller is forced to add queries it does not need.
 *
 * When `known` is supplied it must be the CURRENT reading of those rows, taken
 * inside the same transaction. It only feeds the "gone / not purchasable"
 * classification; the availability DECISION is still made exclusively by the
 * guarded update below, so a stale `known` entry cannot let a claim through.
 *
 * @param items  `{ productId, quantity }` — one entry per distinct product,
 *               quantities already summed. `quantity` must be >= 1.
 * @param tx     Transaction client. Required: a claim that is not part of the
 *               order's transaction could commit while the order fails.
 * @param known  Optional pre-read rows, keyed by product id, for `items`'
 *               products. Read inside the same transaction.
 * @returns      `{ claimedIds, unavailable }` — ids that were decremented (all
 *               of them when `unavailable` is empty) and the slugs that could
 *               not be satisfied.
 */
export async function claimProductStock(
  items: { productId: string; quantity: number }[],
  tx: Prisma.TransactionClient,
  known?: ReadonlyMap<string, ClaimableProduct>,
): Promise<{ claimedIds: string[]; unavailable: string[] }> {
  const claimedIds: string[] = [];
  const unavailable: string[] = [];

  for (const { productId, quantity } of items) {
    // The row is read for its slug (the human handle used in the error) and to
    // distinguish "gone" from "not purchasable"; the DECISION, however, is
    // made by the guarded update below, never by this read. Callers that
    // already read the rows pass them in, skipping a duplicate round trip.
    const product =
      known?.get(productId) ??
      (await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, slug: true, existsInStore: true, priceToman: true },
      }));

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
