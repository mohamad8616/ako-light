import { prisma } from "@/lib/db/prisma";
import { releaseOrderStock } from "./stock";

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
 *   4. **A cancelled fulfilment is refused on BOTH transitions.** Cancelling an
 *      order returns its reservation in `updateOrderFulfillmentStatus`, so a row
 *      whose fulfilment is `cancelled` no longer holds stock. Letting a later
 *      callback write `paid` would sell inventory the order does not have, and
 *      letting it write `failed` would release (credit) the reservation a second
 *      time. The WHERE clause therefore excludes cancelled fulfilments.
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
        // A CANCELLED FULFILMENT is refused on BOTH transitions. This is an
        // INVENTORY guard on the payment axis, not a merge of the two axes:
        //   - `→ paid` is refused because the reservation was released when the
        //     order was cancelled, so writing `paid` would record a payment for
        //     goods the shop no longer holds ("paid with phantom inventory").
        //     lib/payments/settlement.ts refuses the same case up front.
        //   - `→ failed` is refused because `failed` RELEASES the reservation,
        //     and this order's was already returned by the cancellation — a
        //     decline callback arriving afterwards would otherwise credit the
        //     shelf a second time.
        // The stale sweep additionally pins `fulfillmentStatus = "unfulfilled"`
        // (below), which already excludes cancelled orders; the two agree, so
        // the sweep's behaviour is unchanged.
        fulfillmentStatus: staleBefore
          ? ("unfulfilled" as const)
          : { not: "cancelled" as const },
        ...(staleBefore ? { createdAt: { lt: staleBefore } } : {}),
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
