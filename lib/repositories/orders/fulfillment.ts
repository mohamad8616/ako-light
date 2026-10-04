import { prisma } from "@/lib/db/prisma";
import {
  checkFulfillmentTransition,
  releasesReservationOnCancel,
  type FulfillmentStatus,
  type TransitionRefusal,
} from "@/lib/orders/lifecycle";
import { releaseOrderStock } from "./stock";

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
 *   3. **Cancelling an unpaid order returns its reservation, exactly once.**
 *      A `pending` order's checkout reservation (`claimProductStock`) is still
 *      held, and the stale sweep will never touch the order once its fulfilment
 *      is `cancelled` — so this IS the release path. It runs only after the
 *      guarded update matched a row (the winner), INSIDE the same transaction,
 *      so:
 *        - a repeat cancellation is a same-state no-op and moves no stock;
 *        - a duplicate concurrent cancellation matches 0 rows and throws, so
 *          the two callers cannot both credit the shelf.
 *      A `paid` order releases nothing (the goods are owed; there is no
 *      automatic refund) and a `failed` order releases nothing (its reservation
 *      was already returned by the `pending → failed` transition).
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

    // The guarded update above is the IDEMPOTENCY + CONCURRENCY guard: it matched
    // a row exactly once, so exactly one caller reaches this release for this
    // transition. See guarantee (3) in the doc comment for why each payment
    // status is handled the way it is.
    if (releasesReservationOnCancel(from, fulfillmentStatus, order.status)) {
      await releaseOrderStock(id, tx);
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
