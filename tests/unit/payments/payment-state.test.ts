/**
 * The payment state machine and the reconciliation PLAN — the pure half of
 * Pass 14.5's settlement logic.
 *
 * These tests pin the two decisions that a payment callback must get right, and
 * that a database test alone cannot express clearly:
 *
 *   1. which source states may become `paid`, and why `cancelled` may not;
 *   2. how a `failed` order (whose reservation the stale sweep released) must be
 *      reconciled rather than blindly flipped to `paid`.
 *
 * The DATABASE half — proving stock really is re-reserved, and that concurrent
 * settlements cannot double-settle — lives in tests/server/payment-settlement.
 */
import {
  checkPaymentFailureTransition,
  checkPaymentSuccessTransition,
  isSettledPaymentStatus,
  type PaymentStatus,
} from "@/lib/payments/payment-state";
import {
  isPlausibleAuthority,
  planReconciliation,
} from "@/lib/payments/settlement";
import { describe, expect, it } from "vitest";

describe("checkPaymentSuccessTransition", () => {
  it("allows pending → paid with no stock work", () => {
    expect(checkPaymentSuccessTransition("pending")).toEqual({
      ok: true,
      reconciliation: "none",
    });
  });

  it("treats a re-verification of a paid order as an idempotent success", () => {
    // A duplicate callback, a refresh, a gateway retry. Legal, but a no-op.
    expect(checkPaymentSuccessTransition("paid")).toEqual({
      ok: true,
      reconciliation: "none",
    });
  });

  it("allows failed → paid ONLY through reconciliation", () => {
    // The stale-sweep case: ZarinPal confirms a payment on an order the sweep
    // already failed. Legal, but the caller must re-establish the reservation.
    expect(checkPaymentSuccessTransition("failed")).toEqual({
      ok: true,
      reconciliation: "reReserve",
    });
  });

  it("refuses cancelled → paid", () => {
    // A cancellation is a deliberate human decision and its stock was released;
    // a late gateway success must not silently resurrect it.
    expect(checkPaymentSuccessTransition("cancelled")).toEqual({
      ok: false,
      reason: "cancelled",
    });
  });

  it("refuses a status outside the enum", () => {
    expect(checkPaymentSuccessTransition("refunded" as PaymentStatus)).toEqual({
      ok: false,
      reason: "unknownStatus",
    });
  });

  it("never reports a downgrade path — paid can never be moved away from", () => {
    // The one-way guarantee is that NOTHING here makes `paid` become another
    // state: a successful verification of a paid order is still `paid`.
    for (const from of ["pending", "paid", "failed", "cancelled"] as const) {
      const check = checkPaymentSuccessTransition(from);
      if (check.ok) {
        // Every permitted success transition ends in `paid`; there is no
        // "unpaid" branch to fall through to.
        expect(check.reconciliation).not.toBe("manualReview");
      }
    }
    expect(isSettledPaymentStatus("paid")).toBe(true);
  });
});

describe("checkPaymentFailureTransition", () => {
  it("allows only pending → failed", () => {
    expect(checkPaymentFailureTransition("pending")).toBe(true);
  });

  it("refuses to downgrade a paid order", () => {
    // The data-corruption bug: a re-delivered failure callback must not undo a
    // confirmed payment (nor double-release its stock).
    expect(checkPaymentFailureTransition("paid")).toBe(false);
  });

  it("refuses failed → failed and cancelled → failed", () => {
    expect(checkPaymentFailureTransition("failed")).toBe(false);
    expect(checkPaymentFailureTransition("cancelled")).toBe(false);
  });
});

describe("isSettledPaymentStatus", () => {
  it("is true only for paid", () => {
    expect(isSettledPaymentStatus("paid")).toBe(true);
    for (const status of ["pending", "failed", "cancelled"] as const) {
      expect(isSettledPaymentStatus(status)).toBe(false);
    }
  });
});

describe("planReconciliation", () => {
  it("plans no stock work for a fresh pending order", () => {
    expect(planReconciliation("pending")).toEqual({ mode: "none" });
  });

  it("plans no stock work for an already-paid order", () => {
    expect(planReconciliation("paid")).toEqual({ mode: "none" });
  });

  it("plans a re-reservation for a failed order", () => {
    // `failed` means the reservation was (almost certainly) already released, so
    // the settle transaction must re-claim it before writing paid.
    expect(planReconciliation("failed")).toEqual({ mode: "reReserve" });
  });

  it("plans manual review — never paid — for a cancelled order", () => {
    const plan = planReconciliation("cancelled");
    expect(plan.mode).toBe("manualReview");
  });

  it("plans manual review for an unrecognised status", () => {
    const plan = planReconciliation("weird" as PaymentStatus);
    expect(plan.mode).toBe("manualReview");
  });
});

describe("isPlausibleAuthority", () => {
  it("accepts a ZarinPal-shaped authority", () => {
    expect(isPlausibleAuthority("A0000000000000000000000000000000")).toBe(true);
    expect(isPlausibleAuthority("ZF1234567890ABCDEF1234567890ABCDEF")).toBe(
      true,
    );
  });

  it("rejects empty, whitespace and non-string input", () => {
    expect(isPlausibleAuthority("")).toBe(false);
    expect(isPlausibleAuthority("   ")).toBe(false);
    expect(isPlausibleAuthority(undefined)).toBe(false);
    expect(isPlausibleAuthority(null)).toBe(false);
  });

  it("rejects a value that is too short to be an authority", () => {
    // A hand-typed or truncated value must not reach a database lookup.
    expect(isPlausibleAuthority("abc")).toBe(false);
    expect(isPlausibleAuthority("A0000000000")).toBe(false);
  });

  it("rejects punctuation — a raw order id or a crafted URL fragment is not an authority", () => {
    expect(isPlausibleAuthority("AUTH-1a2b3c4d-5e6f")).toBe(false);
    expect(isPlausibleAuthority("../../etc/passwd")).toBe(false);
    expect(
      isPlausibleAuthority("A0000000000000000000000000000000' OR 1=1"),
    ).toBe(false);
  });

  it("rejects an over-long value", () => {
    expect(isPlausibleAuthority("A".repeat(65))).toBe(false);
  });
});
