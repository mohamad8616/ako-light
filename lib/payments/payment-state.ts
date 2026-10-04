/**
 * The PAYMENT state machine — the single source of truth for which
 * `Order.status` transitions a payment callback is allowed to make.
 *
 * PAYMENT AND FULFILMENT ARE SEPARATE AXES (see lib/orders/lifecycle.ts).
 * `Order.status` records what the GATEWAY said and is written only by the
 * ZarinPal settlement path; `fulfillmentStatus` records what the shop did and is
 * the admin-writable half. Nothing here can touch fulfilment.
 *
 * Pure and dependency-free ON PURPOSE: it is imported by the settlement path
 * (server) and by tests, and must be usable from a client bundle without pulling
 * the generated Prisma client (which imports `node:` builtins at module top).
 * The union below must stay 1:1 with `OrderStatus` in prisma/schema.prisma.
 *
 * ---------------------------------------------------------------------------
 * Why this exists at all
 * ---------------------------------------------------------------------------
 * `claimPendingOrder` already guards its write at the DATABASE level, so two
 * callbacks cannot both settle one order. What it does NOT do is decide whether
 * a given source state may legally become paid. That decision used to be
 * implicit in its WHERE clause (`status: { not: "paid" }` for `paid`), which
 * means every non-paid state — including `failed` and `cancelled` — could be
 * flipped to paid by a later callback, with no check that the stock reservation
 * those states imply was ever released or ever restored.
 *
 * This module makes the decision EXPLICIT and testable, and distinguishes the
 * two very different ways a `failed` order can be settled by a late successful
 * verification:
 *
 *   - the reservation is still held  → a plain repair to `paid` is correct;
 *   - the reservation was RELEASED (the Pass 15.5 stale sweep, or a
 *     non-success callback) → marking it paid would claim inventory the order
 *     does not hold. That is the "paid with phantom inventory" bug, and it must
 *     be reconciled by re-reserving stock, or parked for a human.
 *
 * The reconciliation decision needs DATABASE facts (does the reservation still
 * exist? is stock still available?), so this module only models the transition
 * and names the reconciliation outcome. The caller supplies the facts.
 */

/** `Order.status` — payment. Written only by ZarinPal settlement. */
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

/** The value the settlement path may write. There is no `cancelled` writer today. */
export type SettleableStatus = "paid" | "failed";

/**
 * Why a transition was refused. Mapped to copy/log categories by the caller;
 * never rendered raw to a customer.
 */
export type PaymentTransitionRefusal =
  "alreadyPaid" | "cancelled" | "unknownStatus";

export type PaymentTransitionCheck =
  | { ok: true; reconciliation: ReconciliationMode }
  | { ok: false; reason: PaymentTransitionRefusal };

/**
 * How a successful verification should be recorded, once the source state and
 * the stock-reservation facts are known.
 *
 *   - `"none"`        — no stock work needed: a plain `pending → paid`, or a
 *                       re-verification of an order that is already paid.
 *   - `"reReserve"`   — the order is `failed` and its reservation was released;
 *                       the settle transaction must re-claim the ordered
 *                       quantities, and only then may the status become paid.
 *   - `"manualReview"`— the order is `failed`, its reservation was released,
 *                       and stock can no longer be satisfied. The order MUST
 *                       NOT become paid, because it cannot be fulfilled from
 *                       inventory it does not hold.
 */
export type ReconciliationMode = "none" | "reReserve" | "manualReview";

/**
 * Whether writing `to` from `from` is permitted for a SUCCESSFUL verification.
 *
 * Legal successful transitions:
 *
 *   pending → paid   the ordinary path.
 *   paid    → paid   idempotent; the caller must NOT duplicate side effects.
 *   failed  → paid   a late/duplicate gateway success, subject to
 *                    reconciliation — see the note below.
 *
 * Refused:
 *
 *   cancelled → paid  the order was deliberately cancelled. A cancellation is
 *                     an explicit human decision and its stock was released;
 *                     resurrecting it silently would re-sell inventory a human
 *                     chose to release. (Checkout never writes `cancelled`
 *                     today; the state is reserved for an operator decision, so
 *                     treating it as unrecoverable keeps that decision
 *                     authoritative.)
 *   <unknown> → paid  a status not in the enum cannot be reasoned about safely.
 *
 * NOTE on `failed`: this function says the transition is LEGAL, not that it is
 * safe on its own. `reconciliation` tells the caller what the stock facts
 * require; for `failed` it is deliberately reported as `"reReserve"` because a
 * `failed` order's reservation is USUALLY already released (that is what the
 * failure transition does). The caller MUST confirm availability and downgrade
 * to `"manualReview"` when it cannot be re-reserved.
 */
export function checkPaymentSuccessTransition(
  from: PaymentStatus,
): PaymentTransitionCheck {
  switch (from) {
    case "pending":
      return { ok: true, reconciliation: "none" };
    case "paid":
      // Idempotent re-verification. Legal, but a no-op: no stock movement, no
      // second payment record, no second receipt.
      return { ok: true, reconciliation: "none" };
    case "failed":
      // Legal ONLY with reconciliation. The settlement path must prove the
      // reservation is held again (or already still held) before writing paid.
      return { ok: true, reconciliation: "reReserve" };
    case "cancelled":
      return { ok: false, reason: "cancelled" };
    default:
      return { ok: false, reason: "unknownStatus" };
  }
}

/**
 * Whether a failure verdict may be recorded.
 *
 * Only `pending → failed` is legal. A paid order can never be downgraded by a
 * re-delivered failure callback (that is the data-corruption bug the gateway
 * classification exists to prevent), and a `cancelled` order stays cancelled.
 */
export function checkPaymentFailureTransition(from: PaymentStatus): boolean {
  return from === "pending";
}

/** True when the state is terminal and no payment callback may change it. */
export function isSettledPaymentStatus(status: PaymentStatus): boolean {
  return status === "paid";
}
