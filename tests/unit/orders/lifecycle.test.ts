/**
 * The order lifecycle rules (Pass 15).
 *
 * Pure and hermetic — no database, no Next. `checkFulfillmentTransition` is what
 * the repository enforces and what the admin dropdown filters on, so pinning it
 * here is what keeps "an order cannot go backwards" from silently regressing.
 */
import { describe, expect, it } from "vitest";
import {
  checkFulfillmentTransition,
  deriveTimeline,
  FULFILLMENT_STATUSES,
  isTerminalFulfillmentStatus,
  releasesReservationOnCancel,
  TIMELINE_STEP_KEYS,
  type FulfillmentStatus,
  type OrderPaymentStatus,
} from "@/lib/orders/lifecycle";

describe("fulfillment status set", () => {
  it("lists the lifecycle in order, ending in the terminal states", () => {
    expect(FULFILLMENT_STATUSES).toEqual([
      "unfulfilled",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ]);
  });

  it("treats delivered and cancelled as terminal, nothing else", () => {
    expect(isTerminalFulfillmentStatus("delivered")).toBe(true);
    expect(isTerminalFulfillmentStatus("cancelled")).toBe(true);
    expect(isTerminalFulfillmentStatus("unfulfilled")).toBe(false);
    expect(isTerminalFulfillmentStatus("processing")).toBe(false);
    expect(isTerminalFulfillmentStatus("shipped")).toBe(false);
  });
});

describe("checkFulfillmentTransition — allowed moves on a PAID order", () => {
  it.each([
    ["unfulfilled", "processing"],
    ["unfulfilled", "shipped"],
    ["unfulfilled", "cancelled"],
    ["processing", "shipped"],
    ["processing", "cancelled"],
    ["shipped", "delivered"],
    ["shipped", "cancelled"],
  ] as [FulfillmentStatus, FulfillmentStatus][])(
    "%s -> %s is allowed",
    (from, to) => {
      expect(checkFulfillmentTransition(from, to, "paid")).toEqual({
        ok: true,
        changed: true,
      });
    },
  );

  it("allows a forward skip — a shop may ship without recording processing", () => {
    expect(checkFulfillmentTransition("unfulfilled", "shipped", "paid")).toEqual({
      ok: true,
      changed: true,
    });
  });
});

describe("checkFulfillmentTransition — refused moves", () => {
  it("refuses to walk an order backwards", () => {
    expect(checkFulfillmentTransition("shipped", "processing", "paid")).toEqual({
      ok: false,
      reason: "notAllowed",
    });
    expect(checkFulfillmentTransition("processing", "unfulfilled", "paid")).toEqual(
      { ok: false, reason: "notAllowed" },
    );
    // The case the pass names explicitly.
    expect(checkFulfillmentTransition("delivered", "unfulfilled", "paid")).toEqual(
      { ok: false, reason: "terminalState" },
    );
  });

  it("refuses to leave a terminal state at all", () => {
    for (const to of FULFILLMENT_STATUSES) {
      if (to === "delivered") continue;
      expect(checkFulfillmentTransition("delivered", to, "paid")).toEqual({
        ok: false,
        reason: "terminalState",
      });
    }
    expect(checkFulfillmentTransition("cancelled", "shipped", "paid")).toEqual({
      ok: false,
      reason: "terminalState",
    });
  });

  it("refuses to START fulfilment on an order that has not been paid", () => {
    // The case §9 of the pass names: PENDING -> PROCESSING must fail.
    expect(
      checkFulfillmentTransition("unfulfilled", "processing", "pending"),
    ).toEqual({ ok: false, reason: "paymentNotSettled" });
    expect(checkFulfillmentTransition("unfulfilled", "shipped", "pending")).toEqual(
      { ok: false, reason: "paymentNotSettled" },
    );
    expect(checkFulfillmentTransition("processing", "shipped", "failed")).toEqual({
      ok: false,
      reason: "paymentNotSettled",
    });
  });

  it("still allows CANCELLING an unpaid or failed order", () => {
    for (const payment of ["pending", "failed", "cancelled"] as OrderPaymentStatus[]) {
      expect(
        checkFulfillmentTransition("unfulfilled", "cancelled", payment),
      ).toEqual({ ok: true, changed: true });
    }
  });

  it("refuses an unrecognised status rather than guessing", () => {
    expect(
      checkFulfillmentTransition("nonsense" as FulfillmentStatus, "shipped", "paid"),
    ).toEqual({ ok: false, reason: "unknownStatus" });
    expect(
      checkFulfillmentTransition("unfulfilled", "nonsense" as FulfillmentStatus, "paid"),
    ).toEqual({ ok: false, reason: "unknownStatus" });
  });
});

describe("checkFulfillmentTransition — same-state submit", () => {
  it("is a no-op, not an error, so a double-clicked form is harmless", () => {
    for (const status of FULFILLMENT_STATUSES) {
      expect(checkFulfillmentTransition(status, status, "paid")).toEqual({
        ok: true,
        changed: false,
      });
    }
  });

  it("does not let a same-state submit bypass the payment rule", () => {
    // Still a no-op — nothing is written — but the caller must not be told a
    // change happened.
    expect(checkFulfillmentTransition("shipped", "shipped", "pending")).toEqual({
      ok: true,
      changed: false,
    });
  });
});

describe("releasesReservationOnCancel — the inventory half of a cancellation", () => {
  /** The states a cancellation move can actually come from. */
  const cancellable = FULFILLMENT_STATUSES.filter(
    (status) => !isTerminalFulfillmentStatus(status),
  );

  it("returns the reservation when an UNPAID order is cancelled", () => {
    // The leak this fixes: a `pending` order still holds its checkout
    // reservation, and the stale sweep ignores a cancelled order — so if the
    // cancellation does not release, those units are gone from the shelf
    // forever.
    for (const from of cancellable) {
      expect(releasesReservationOnCancel(from, "cancelled", "pending")).toBe(true);
    }
  });

  it("never releases a PAID or already-released order's stock", () => {
    // The goods are owed, so the ordered inventory stays accounted for exactly
    // once. Cancelling a paid order is an operational record, not a stock
    // movement — and this project has NO automatic refund. A `failed` payment
    // already returned the reservation, so releasing again would over-credit.
    for (const from of cancellable) {
      expect(releasesReservationOnCancel(from, "cancelled", "paid")).toBe(false);
      expect(releasesReservationOnCancel(from, "cancelled", "failed")).toBe(false);
      expect(releasesReservationOnCancel(from, "cancelled", "cancelled")).toBe(false);
    }
  });

  it("never releases for a terminal state — that move does not exist", () => {
    for (const from of FULFILLMENT_STATUSES.filter(
      isTerminalFulfillmentStatus,
    )) {
      for (const payment of [
        "pending",
        "paid",
        "failed",
        "cancelled",
      ] as OrderPaymentStatus[]) {
        expect(releasesReservationOnCancel(from, "cancelled", payment)).toBe(false);
      }
    }
  });

  it("releases only on a move INTO cancelled", () => {
    // Every forward step keeps the reservation; only abandonment returns it.
    for (const to of ["processing", "shipped", "delivered"] as FulfillmentStatus[]) {
      expect(releasesReservationOnCancel("unfulfilled", to, "pending")).toBe(false);
    }
    // A same-state submit is a no-op, so it must not move stock either.
    expect(releasesReservationOnCancel("cancelled", "cancelled", "pending")).toBe(false);
    expect(releasesReservationOnCancel("unfulfilled", "unfulfilled", "pending")).toBe(false);
  });

  it("agrees with the transition check: release implies the move was allowed", () => {
    for (const from of FULFILLMENT_STATUSES) {
      for (const payment of [
        "pending",
        "paid",
        "failed",
        "cancelled",
      ] as OrderPaymentStatus[]) {
        if (!releasesReservationOnCancel(from, "cancelled", payment)) continue;
        expect(checkFulfillmentTransition(from, "cancelled", payment)).toEqual({
          ok: true,
          changed: true,
        });
      }
    }
  });
});

describe("deriveTimeline", () => {
  it("always marks the order as placed", () => {
    const steps = deriveTimeline("pending", "unfulfilled");
    expect(steps[0]).toEqual({ key: "placed", done: true });
  });

  it("marks steps as reached from the current state", () => {
    expect(deriveTimeline("paid", "unfulfilled").map((s) => s.done)).toEqual([
      true, true, false, false, false,
    ]);
    expect(deriveTimeline("paid", "processing").map((s) => s.done)).toEqual([
      true, true, true, false, false,
    ]);
    expect(deriveTimeline("paid", "shipped").map((s) => s.done)).toEqual([
      true, true, true, true, false,
    ]);
    expect(deriveTimeline("paid", "delivered").map((s) => s.done)).toEqual([
      true, true, true, true, true,
    ]);
  });

  it("shows only 'placed' for an order that will not progress", () => {
    for (const payment of ["failed", "cancelled"] as OrderPaymentStatus[]) {
      expect(deriveTimeline(payment, "unfulfilled").map((s) => s.done)).toEqual([
        true, false, false, false, false,
      ]);
    }
    // A cancelled fulfilment resets the progress, whatever the payment says.
    expect(deriveTimeline("paid", "cancelled").map((s) => s.done)).toEqual([
      true, true, false, false, false,
    ]);
  });

  it("never marks a fulfilment step reached before payment", () => {
    // Even if a row somehow held an advanced fulfilment status while unpaid,
    // the timeline must not claim progress that has not been paid for.
    const steps = deriveTimeline("pending", "shipped");
    expect(steps.find((s) => s.key === "processing")?.done).toBe(false);
    expect(steps.find((s) => s.key === "shipped")?.done).toBe(false);
  });

  it("returns one entry per step, in lifecycle order", () => {
    const steps = deriveTimeline("paid", "shipped");
    expect(steps.map((s) => s.key)).toEqual([...TIMELINE_STEP_KEYS]);
  });
});
