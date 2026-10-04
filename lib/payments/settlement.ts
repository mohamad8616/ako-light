/**
 * ZarinPal settlement — verification, association, reconciliation, idempotency.
 *
 * This is the ONLY server path that may turn an order `paid`. It exists because
 * the checkout callback used to make three assumptions that are all false:
 *
 *   1. that `?orderId=` identifies the payment (it is customer-supplied, so it
 *      selects which order to modify rather than which order was paid);
 *   2. that the customer's return from ZarinPal is proof of payment (a browser
 *      redirect is not; only a server-side `verify` call is);
 *   3. that `pending → failed` is the only way stock leaves a reservation, so a
 *      `failed → paid` "repair" can never be followed by a late success.
 *
 * The third is the dangerous one. The Pass 15.5 stale sweep releases the
 * reservation when it fails an order, so a DELAYED successful verification
 * arrives at an order whose stock has already been returned to the shelf.
 * Flipping that order to `paid` would sell inventory the order does not hold —
 * "paid with phantom inventory". This module therefore verifies first, then
 * reconciles the reservation INSIDE the same transaction as the status change,
 * and refuses to write `paid` when it cannot.
 *
 * ---------------------------------------------------------------------------
 * The authoritative flow
 * ---------------------------------------------------------------------------
 *
 *   callback
 *     ↓
 *   resolve order from the STORED zarinpalAuthority (not from the query string)
 *     ↓
 *   verify with ZarinPal using the STORED total (server-side amount)
 *     ↓
 *   validate the gateway verdict (code, reference id)
 *     ↓
 *   settle atomically: guarded status transition + reservation reconciliation
 *
 * Nothing here trusts the browser: not the order id, not the authority, not the
 * status, not the amount. The authority is used to FIND the order, and the
 * amount comes from that order's own row.
 */
import { prisma } from "@/lib/db/prisma";
import {
  checkPaymentFailureTransition,
  checkPaymentSuccessTransition,
  type PaymentStatus,
  type PaymentTransitionRefusal,
} from "@/lib/payments/payment-state";
import type { FulfillmentStatus } from "@/lib/orders/lifecycle";
import {
  claimProductStock,
  releaseOrderStock,
} from "@/lib/repositories/orders";
import { verify, ZarinPalError } from "./zarinpal";

/** The narrow projection settlement needs. Payment internals stay server-side. */
export type SettleableOrder = {
  id: string;
  status: PaymentStatus;
  userId: string;
  /** Stored in Toman — the ONLY authoritative amount. Never from the client. */
  totalAmount: number;
  zarinpalAuthority: string | null;
  /**
   * The FULFILMENT axis. Settlement never writes it — it is read purely as a
   * refusal precondition. A `cancelled` fulfilment means an operator abandoned
   * the order and its reservation was already returned to the shelf (see
   * `updateOrderFulfillmentStatus`), so a late gateway success must not settle
   * it: that would be "paid with phantom inventory", and it would re-open the
   * exact state the cancellation closed.
   */
  fulfillmentStatus: FulfillmentStatus;
};

/**
 * How a settlement request ended. Every branch is explicit so the caller can
 * map it to copy WITHOUT parsing an error message, and so tests can assert the
 * exact outcome rather than "it did not throw".
 */
export type SettlementOutcome =
  /** The payment was verified and the order is now `paid`. */
  | { kind: "paid"; orderId: string; refId: string | null; changed: boolean }
  /** ZarinPal rejected the payment. The order is `failed` (or already settled). */
  | { kind: "failed"; orderId: string; changed: boolean }
  /** ZarinPal was unreachable / gave no verdict. The order is UNCHANGED. */
  | { kind: "unconfirmed"; orderId: string }
  /** The order is already paid; nothing was written. Idempotent success. */
  | { kind: "alreadyPaid"; orderId: string }
  /** The callback's order reference does not match the authority's order. */
  | { kind: "mismatch"; orderId: string }
  /** No order carries this authority, or the authority is missing/malformed. */
  | { kind: "unknownAuthority"; orderId: string | null }
  /** The order is `cancelled` — a deliberate human decision, not resurrected. */
  | { kind: "cancelled"; orderId: string }
  /**
   * The order was `failed` with its reservation released, ZarinPal confirms
   * payment, but the stock can no longer be satisfied. The order stays
   * `failed` and is marked for manual review — it must never claim inventory
   * it does not hold.
   */
  | { kind: "manualReview"; orderId: string }
  /** A database fault during the settle transaction. Nothing was written. */
  | { kind: "error"; orderId: string };

/**
 * Finds the order a payment authority belongs to.
 *
 * THE association. ZarinPal echoes back the authority issued for the payment
 * request, and the checkout action stored it on the order row
 * (`createOrder` → `order.update({ zarinpalAuthority })`), so this lookup is
 * the authoritative link between a payment and an order.
 *
 * The query string's `orderId` is NOT consulted here — it cannot select which
 * order is modified.
 */
export async function findOrderByAuthority(
  authority: string,
): Promise<SettleableOrder | null> {
  if (!isPlausibleAuthority(authority)) return null;

  const row = await prisma.order.findFirst({
    where: { zarinpalAuthority: authority },
    select: {
      id: true,
      status: true,
      fulfillmentStatus: true,
      userId: true,
      totalAmount: true,
      zarinpalAuthority: true,
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    status: row.status as PaymentStatus,
    fulfillmentStatus: row.fulfillmentStatus as FulfillmentStatus,
    userId: row.userId,
    // Decimal -> number at the boundary. Stored Toman, never Rial.
    totalAmount: Number(row.totalAmount.toString()),
    zarinpalAuthority: row.zarinpalAuthority,
  };
}

/**
 * Structural sanity check for a ZarinPal authority.
 *
 * ZarinPal issues a 36-character uppercase alphanumeric authority. This is a
 * cheap rejection of empty/absurd input BEFORE a database round-trip; it is
 * deliberately permissive about the exact alphabet (a stricter regex could
 * break if ZarinPal widens the format) and it never substitutes for the
 * database lookup, which is the real authority check.
 */
export function isPlausibleAuthority(
  authority: string | undefined | null,
): boolean {
  if (typeof authority !== "string") return false;
  const trimmed = authority.trim();
  return /^[A-Za-z0-9]{16,64}$/.test(trimmed);
}

/**
 * The result of the reconciliation analysis, BEFORE any write.
 *
 * Kept separate from the transaction so the decision is unit-testable without a
 * database.
 */
export type ReconciliationPlan =
  /** No stock work: `pending → paid`, or a re-verification of a paid order. */
  | { mode: "none" }
  /** Re-claim the ordered quantities as part of the settle transaction. */
  | { mode: "reReserve" }
  /** The order cannot be fulfilled; do not mark it paid. */
  | {
      mode: "manualReview";
      reason: PaymentTransitionRefusal | "notReservable";
    };

/**
 * Decides how a successful verification should be recorded, given the order's
 * CURRENT payment status.
 *
 * This is the pure half of the stale-order reconciliation: it says what SHOULD
 * happen. The transaction below proves the stock facts and may downgrade a
 * `reReserve` to `manualReview`.
 */
export function planReconciliation(status: PaymentStatus): ReconciliationPlan {
  const check = checkPaymentSuccessTransition(status);
  if (!check.ok) {
    return { mode: "manualReview", reason: check.reason };
  }
  // `check.reconciliation` is `none | reReserve | manualReview`; the state
  // machine only ever returns the latter alongside a refusal, which is handled
  // above, so narrowing here keeps the plan's `manualReview` case carrying a
  // reason.
  return check.reconciliation === "manualReview"
    ? { mode: "manualReview", reason: "notReservable" }
    : { mode: check.reconciliation };
}

/**
 * Verifies and settles one payment callback, atomically and idempotently.
 *
 * @param params.authority  The gateway authority from the callback. It selects
 *   the order; it is never trusted as proof of anything on its own.
 * @param params.orderIdHint The `?orderId=` from the URL, if present. Used ONLY
 *   as a consistency check against the authority's order — it can never select
 *   another order.
 */
export async function settlePayment(params: {
  authority: string;
  orderIdHint?: string | null;
}): Promise<SettlementOutcome> {
  const { authority, orderIdHint } = params;

  const order = await findOrderByAuthority(authority);

  if (!order) {
    // Either the authority is malformed, or it belongs to no order. Both mean we
    // cannot know WHICH order was paid, so nothing is touched.
    return { kind: "unknownAuthority", orderId: orderIdHint ?? null };
  }

  // The URL's orderId is a consistency check ONLY. A callback that names a
  // different order than the authority belongs to is either a bug or an attack;
  // either way we must not modify EITHER order, and must not release or restore
  // stock for either.
  if (orderIdHint && orderIdHint !== order.id) {
    return { kind: "mismatch", orderId: order.id };
  }

  // Already paid: return the existing successful state without re-verifying,
  // without stock movement, and without a second payment/side effect. This is
  // the duplicate-callback / refresh / gateway-retry path.
  if (order.status === "paid") {
    return { kind: "alreadyPaid", orderId: order.id };
  }

  if (order.status === "cancelled" || order.fulfillmentStatus === "cancelled") {
    // A deliberate cancellation is not resurrected by a later gateway success.
    // Nothing is written and no stock is touched.
    //
    // The FULFILMENT check is the operator-side cancellation. Only the gateway
    // may write `Order.status`, so an admin cancelling an unpaid order leaves
    // the payment axis at `pending` while `fulfillmentStatus` becomes
    // `cancelled` — and that cancellation already returned the reservation.
    // Without this check the callback would flip the order to `paid`, producing
    // "paid with phantom inventory" on an order an operator deliberately
    // abandoned.
    //
    // The callback is NOT swallowed: this project has no automatic refund path,
    // so a real charge on a cancelled order is an operational signal that a
    // human must resolve. Log the category and order id (never customer, amount
    // or gateway data) and answer with the `cancelled` copy, which already tells
    // the customer to contact us instead of paying again.
    logSafely("cancelled-order-callback", order.id, "settlement refused");
    return { kind: "cancelled", orderId: order.id };
  }

  // Verify with ZarinPal BEFORE settling. The amount is the order's OWN stored
  // Toman total — never a query parameter. `verify` applies the frozen x10
  // Toman→Rial conversion at the gateway boundary.
  let refId: string | null;
  try {
    const result = await verify({
      authority,
      amountToman: order.totalAmount,
    });
    refId = result.refId ?? null;
  } catch (error) {
    if (error instanceof ZarinPalError && error.isGatewayFault) {
      // NO VERDICT. Leave the order exactly as it is so a later verification can
      // still settle it — writing `failed` here would make a real payment
      // indistinguishable from a decline (see lib/payments/zarinpal.ts).
      logSafely("gateway-fault", order.id, error.message);
      return { kind: "unconfirmed", orderId: order.id };
    }

    // ZarinPal answered about THIS payment and the answer was no: record the
    // failure. `claimPaymentFailure` only ever moves `pending → failed`, so a
    // concurrent callback that already settled it paid cannot be downgraded.
    const changed = await claimPaymentFailure(order.id);
    return { kind: "failed", orderId: order.id, changed };
  }

  // A gateway success code with no reference id is still a success — ZarinPal
  // does not guarantee a ref_id in every envelope — but we never invent one.
  return settleVerifiedPayment({
    orderId: order.id,
    refId,
  });
}

/**
 * Records a verified payment, reconciling the stock reservation atomically.
 *
 * The whole thing is ONE transaction: the guarded status update and the stock
 * movement commit or roll back together, so no observer can see a `paid` order
 * whose reservation was not re-established.
 */
export async function settleVerifiedPayment(params: {
  orderId: string;
  refId: string | null;
}): Promise<SettlementOutcome> {
  const { orderId, refId } = params;

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        // Re-read INSIDE the transaction: the status may have changed since the
        // pre-verification read (another callback, the sweep, an admin action).
        const current = await tx.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true, fulfillmentStatus: true },
        });

        if (!current) return { kind: "error" as const };

        const status = current.status as PaymentStatus;

        if (status === "paid") {
          // Another request settled it between our read and this transaction.
          // Idempotent success: no stock movement, no side effects.
          return { kind: "alreadyPaid" as const };
        }

        // A cancellation on EITHER axis refuses the settlement. The fulfilment
        // axis carries the OPERATOR cancellation (see `settlePayment`) and its
        // reservation has already been returned — settling it would be "paid
        // with phantom inventory".
        if (status === "cancelled" || current.fulfillmentStatus === "cancelled") {
          return { kind: "cancelled" as const };
        }

        const plan = planReconciliation(status);

        if (plan.mode === "manualReview") {
          // A non-reconcilable source state. Do not write `paid`.
          return { kind: "manualReview" as const };
        }

        // Reconcile the reservation BEFORE the guarded update, so a failure here
        // rolls the whole settle back and the order keeps its old status. A
        // `failed` order's reservation was released by the failure transition
        // (or the stale sweep), so it must be re-claimed here — otherwise the
        // order would be paid while holding no stock.
        if (plan.mode === "reReserve") {
          const reReserved = await reReserveOrderStock(orderId, tx);
          if (!reReserved) {
            // Not enough stock (or no reservable lines). The payment is real but
            // the goods are not: keep the order `failed` and surface it for a
            // human. NEVER `paid` with phantom inventory.
            //
            // THROW rather than return: `claimProductStock` decrements each line
            // as it goes, so by the time one line fails the earlier lines have
            // already been decremented. Returning would COMMIT those partial
            // decrements (the callback returning is what commits a Prisma
            // interactive transaction), silently shrinking stock for an order
            // that never became paid. A throw rolls the whole transaction back.
            throw new NotReservableError();
          }
        }

        // The guarded transition. `paid` is only accepted from the states the
        // state machine allows, so a status that changed under us (a concurrent
        // settle, a cancellation) cannot be overwritten.
        const allowedFrom: PaymentStatus[] =
          status === "failed" ? ["failed"] : ["pending"];

        const settled = await tx.order.updateMany({
          where: {
            id: orderId,
            status: { in: allowedFrom },
            // Re-asserted AT THE DATABASE, not merely read above. An operator can
            // cancel between that read and this write, and the cancellation does
            // NOT touch `status` — so without this clause the update would still
            // match and stamp `paid` onto a cancelled order. With it, the cancel
            // wins, this matches 0 rows, and the transaction rolls back (undoing
            // any re-reservation) instead of resurrecting the order.
            fulfillmentStatus: { not: "cancelled" },
          },
          data: {
            status: "paid",
            updatedAt: new Date(),
            ...(refId ? { zarinpalRefId: refId } : {}),
          },
        });

        if (settled.count === 0) {
          // Lost the race. Roll back so the re-reservation above does not leak,
          // then report what the winner left behind.
          throw new ConcurrentSettlementError();
        }

        return { kind: "paid" as const };
      },
      { maxWait: 30_000, timeout: 30_000 },
    );

    switch (outcome.kind) {
      case "paid":
        return { kind: "paid", orderId, refId, changed: true };
      case "alreadyPaid":
        return { kind: "alreadyPaid", orderId };
      case "cancelled":
        return { kind: "cancelled", orderId };
      case "manualReview":
        logSafely(
          "manual-review",
          orderId,
          "reservation could not be re-established",
        );
        return { kind: "manualReview", orderId };
      default:
        return { kind: "error", orderId };
    }
  } catch (error) {
    if (error instanceof NotReservableError) {
      // The transaction rolled back, so NO partial decrement leaked. The order
      // keeps its `failed` status and a human must resolve the payment.
      logSafely(
        "manual-review",
        orderId,
        "reservation could not be re-established",
      );
      return { kind: "manualReview", orderId };
    }

    if (error instanceof ConcurrentSettlementError) {
      // The transaction rolled back, so any re-reservation was undone. Report
      // the winner's state rather than an error.
      const settled = await readSettledState(orderId);
      if (settled?.status === "paid") return { kind: "alreadyPaid", orderId };
      if (settled?.status === "cancelled" || settled?.fulfillmentCancelled) {
        return { kind: "cancelled", orderId };
      }
      return { kind: "failed", orderId, changed: false };
    }

    logSafely("settle-error", orderId, error);
    return { kind: "error", orderId };
  }
}

/**
 * Moves a `pending` order to `failed`, releasing its reservation once.
 *
 * Routed through the same guarded pattern as `claimPendingOrder` so a
 * re-delivered failure callback cannot double-release stock.
 */
export async function claimPaymentFailure(orderId: string): Promise<boolean> {
  const check = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!check || !checkPaymentFailureTransition(check.status as PaymentStatus)) {
    return false;
  }

  try {
    const { claimPendingOrder } = await import("@/lib/repositories/orders");
    const { changed } = await claimPendingOrder({
      orderId,
      status: "failed",
      txOptions: { maxWait: 30_000, timeout: 30_000 },
    });
    return changed;
  } catch (error) {
    logSafely("failure-claim-error", orderId, error);
    return false;
  }
}

/**
 * Re-claims the stock an order originally reserved, inside the caller's
 * transaction. Returns false when a line can no longer be satisfied, in which
 * case the caller MUST NOT mark the order paid.
 */
async function reReserveOrderStock(
  orderId: string,
  tx: Parameters<typeof claimProductStock>[1],
): Promise<boolean> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, quantity: true },
  });

  if (items.length === 0) {
    // An order with no lines cannot hold a reservation. Treat as non-reservable
    // rather than silently "paid" — the data is inconsistent and a human should
    // look at it.
    return false;
  }

  // Sum by product: two lines of the same product must claim their total, not
  // race each other.
  const totals = new Map<string, number>();
  for (const item of items) {
    // A null productId means the product was deleted after ordering; there is
    // no row to claim and the line can no longer be reserved.
    if (!item.productId) return false;
    totals.set(
      item.productId,
      (totals.get(item.productId) ?? 0) + item.quantity,
    );
  }

  const { unavailable } = await claimProductStock(
    [...totals.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
    tx,
  );

  return unavailable.length === 0;
}

/** Internal marker: the guarded update lost a race, so the transaction rolls back. */
class ConcurrentSettlementError extends Error {
  constructor() {
    super("Concurrent settlement lost the guarded update");
    this.name = "ConcurrentSettlementError";
  }
}

/**
 * Internal marker: the reservation could not be re-established.
 *
 * Thrown (rather than returned) so the transaction ROLLS BACK any partial
 * decrement `claimProductStock` already applied. See the call site for why
 * returning would be a silent stock leak.
 */
class NotReservableError extends Error {
  constructor() {
    super("Order stock could not be re-reserved");
    this.name = "NotReservableError";
  }
}

/**
 * Reads the durable state after a lost race.
 *
 * BOTH axes are read: a concurrent OPERATOR cancellation does not change
 * `status`, so the payment column alone cannot tell the loser what won the race
 * — it would report `failed` for an order that was cancelled.
 */
async function readSettledState(
  orderId: string,
): Promise<{ status: PaymentStatus; fulfillmentCancelled: boolean } | null> {
  try {
    const row = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, fulfillmentStatus: true },
    });
    return row
      ? {
          status: row.status as PaymentStatus,
          fulfillmentCancelled: row.fulfillmentStatus === "cancelled",
        }
      : null;
  } catch {
    return null;
  }
}

/**
 * Operational logging that never leaks credentials, gateway secrets, customer
 * data or raw driver errors. Only a category, the order id and a short reason.
 */
function logSafely(category: string, orderId: string, detail: unknown): void {
  const reason =
    detail instanceof Error
      ? detail.name
      : typeof detail === "string"
        ? detail
        : "unknown";
  console.error(`[payments] ${category}`, { orderId, reason });
}

/**
 * Releases an order's reservation and fails it — the NON-success callback path
 * (`Status !== "OK"`, or a missing authority), routed through the same guards.
 *
 * Kept here so the callback has one import for all payment writes, and so the
 * release can only ever accompany the one-way `pending → failed` transition.
 */
export async function failPendingPayment(orderId: string): Promise<boolean> {
  const { claimPendingOrder } = await import("@/lib/repositories/orders");
  try {
    const { changed } = await claimPendingOrder({
      orderId,
      status: "failed",
      txOptions: { maxWait: 30_000, timeout: 30_000 },
    });
    return changed;
  } catch (error) {
    logSafely("non-success-callback-error", orderId, error);
    return false;
  }
}

/** Exported for tests: the release helper used by the failure path. */
export { releaseOrderStock };
