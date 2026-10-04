/**
 * The order lifecycle — the single source of truth for what a status change may
 * do, and for what the customer is shown as progress.
 *
 * Pure and dependency-free ON PURPOSE. It is imported by the admin fulfilment
 * form (a client component) as well as by the server, and the generated Prisma
 * client pulls `node:` builtins at module top level — importing it here would
 * break the client bundle. The unions below are therefore spelled out and must
 * stay 1:1 with `OrderStatus` / `FulfillmentStatus` in prisma/schema.prisma
 * (the same constraint `lib/admin/schemas/order.ts` documents).
 *
 * PAYMENT AND FULFILMENT ARE SEPARATE AXES. `Order.status` records what the
 * gateway said and is written ONLY by the ZarinPal callback; `fulfillmentStatus`
 * records what the shop did and is the admin-writable half. Nothing here lets
 * one impersonate the other.
 */

/** `Order.status` — payment. Written only by the payment callback. */
export type OrderPaymentStatus = "pending" | "paid" | "failed" | "cancelled";

/** `Order.fulfillmentStatus` — the shop's progress. Admin-writable. */
export type FulfillmentStatus =
  | "unfulfilled"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

/** Fulfilment states in lifecycle order (matches the Prisma enum's order). */
export const FULFILLMENT_STATUSES: readonly FulfillmentStatus[] = [
  "unfulfilled",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

/**
 * Allowed fulfilment transitions.
 *
 * The model is FORWARD-ONLY with skippable steps:
 *
 *   unfulfilled → processing → shipped → delivered
 *        └────────────┴──────────┴──────────→ cancelled
 *
 * - Any forward step may be skipped (`unfulfilled → shipped`), because a small
 *   shop may ship without ever recording a "processing" moment.
 * - `cancelled` is reachable from anywhere that is not already terminal.
 * - Nothing moves backwards, and `delivered` / `cancelled` are terminal — so
 *   `delivered → unfulfilled` is refused rather than silently accepted.
 */
const ALLOWED_FULFILLMENT_TRANSITIONS: Record<
  FulfillmentStatus,
  readonly FulfillmentStatus[]
> = {
  unfulfilled: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/** States from which nothing further can happen. */
export const TERMINAL_FULFILLMENT_STATUSES: readonly FulfillmentStatus[] = [
  "delivered",
  "cancelled",
] as const;

export function isTerminalFulfillmentStatus(
  status: FulfillmentStatus,
): boolean {
  return TERMINAL_FULFILLMENT_STATUSES.includes(status);
}

/** Why a transition was refused. Mapped to copy by the caller. */
export type TransitionRefusal =
  | "unknownStatus"
  | "terminalState"
  | "notAllowed"
  | "paymentNotSettled";

export type TransitionCheck =
  | { ok: true; changed: boolean }
  | { ok: false; reason: TransitionRefusal };

/**
 * Whether `from → to` is permitted for an order whose payment status is
 * `paymentStatus`.
 *
 * `changed: false` is returned for a same-state submit: a double-clicked form
 * is a no-op, not an error.
 *
 * The payment rule is the important one: an order may only PROGRESS once it is
 * `paid`. You cannot start preparing, ship or deliver goods nobody has paid for.
 * Cancelling is exempt — abandoning an unpaid order is a normal outcome, and
 * `failed` orders are cancelled rather than progressed.
 */
export function checkFulfillmentTransition(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
  paymentStatus: OrderPaymentStatus,
): TransitionCheck {
  if (!FULFILLMENT_STATUSES.includes(from) || !FULFILLMENT_STATUSES.includes(to)) {
    return { ok: false, reason: "unknownStatus" };
  }

  if (from === to) return { ok: true, changed: false };

  if (isTerminalFulfillmentStatus(from)) {
    return { ok: false, reason: "terminalState" };
  }

  if (!ALLOWED_FULFILLMENT_TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: "notAllowed" };
  }

  // Cancelling an unpaid order is legitimate; progressing one is not.
  if (to !== "cancelled" && paymentStatus !== "paid") {
    return { ok: false, reason: "paymentNotSettled" };
  }

  return { ok: true, changed: true };
}

/**
 * Whether this transition abandons a reservation that is STILL HELD — and so
 * must return the ordered quantities to the shelf, exactly once.
 *
 * The reservation is claimed at checkout (`claimProductStock`) and released by
 * the payment axis: `pending → failed` (a declined callback, a non-success
 * callback, or the stale sweep). So an order holds its reservation exactly
 * while its payment status is `pending`.
 *
 * Cancelling such an order MUST release the stock. It is the ONLY release path
 * left once fulfilment is cancelled, because the stale sweep deliberately
 * selects `fulfillmentStatus = "unfulfilled"` — a cancelled order is invisible
 * to it. Without this, the 2 units reserved for an abandoned order would be
 * gone from the shelf forever.
 *
 * The two cases that must NOT release:
 *
 *   - `paid`: the goods are owed, so its ordered inventory stays accounted for
 *     exactly once. (This project has no automatic refund — see the note on
 *     `releaseOrderStock`. Cancelling a paid order is an operational record,
 *     not an inventory movement.)
 *   - anything already released (`failed`): crediting it again would INFLATE
 *     the shelf. `failed` means the `pending → failed` transition already
 *     returned the reservation.
 *
 * The transition that actually happens is decided by `checkFulfillmentTransition`;
 * this function only answers the inventory question for a `to === "cancelled"`
 * move, and it deliberately refuses the states that move cannot come from — a
 * terminal (`delivered`, `cancelled`) order can never be cancelled again, so it
 * must never be released either. That keeps the pair consistent: a `true` here
 * implies `checkFulfillmentTransition` would allow the move.
 */
export function releasesReservationOnCancel(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
  paymentStatus: OrderPaymentStatus,
): boolean {
  if (to !== "cancelled" || isTerminalFulfillmentStatus(from)) return false;
  return paymentStatus === "pending";
}

// ---------------------------------------------------------------------------
// Customer-facing progress
// ---------------------------------------------------------------------------

export type TimelineStepKey =
  | "placed"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered";

export interface TimelineStep {
  key: TimelineStepKey;
  /** Reached. Derived from the CURRENT state — see the note below. */
  done: boolean;
}

export const TIMELINE_STEP_KEYS: readonly TimelineStepKey[] = [
  "placed",
  "paid",
  "processing",
  "shipped",
  "delivered",
] as const;

/**
 * The customer's progress view, derived from the order's CURRENT state.
 *
 * Deliberately NOT a history: the schema stores no status-change events, so
 * there are no timestamps to show and inventing them would be a lie. A step is
 * simply "reached or not", which is exactly what the two status columns can
 * support.
 *
 * A failed or cancelled order reports only `placed` — the UI pairs this with a
 * status badge, so the customer is told what happened rather than being shown a
 * progress bar that quietly stopped.
 */
export function deriveTimeline(
  paymentStatus: OrderPaymentStatus,
  fulfillmentStatus: FulfillmentStatus,
): TimelineStep[] {
  const paid = paymentStatus === "paid";
  const progress: Record<FulfillmentStatus, number> = {
    unfulfilled: 0,
    processing: 1,
    shipped: 2,
    delivered: 3,
    cancelled: -1,
  };
  const step = progress[fulfillmentStatus] ?? 0;

  return TIMELINE_STEP_KEYS.map((key) => {
    switch (key) {
      case "placed":
        return { key, done: true };
      case "paid":
        return { key, done: paid };
      case "processing":
        return { key, done: paid && step >= 1 };
      case "shipped":
        return { key, done: paid && step >= 2 };
      case "delivered":
        return { key, done: paid && step >= 3 };
    }
  });
}
