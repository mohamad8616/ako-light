/**
 * Cancelling an order must release its reservation — exactly once — and a
 * cancelled order must never come back as `paid`.
 *
 * THE BUG THIS PINS. The two axes are separate by design: only the gateway may
 * write `Order.status`, so an admin cancelling an unpaid order leaves the
 * payment axis at `pending` and writes `fulfillmentStatus = "cancelled"`. Two
 * things were missing around that:
 *
 *   1. the cancellation did not return the checkout reservation, and the stale
 *      sweep selects `fulfillmentStatus = "unfulfilled"` — so a cancelled
 *      order's stock was leaked PERMANENTLY (the sweep can never see it);
 *   2. the settlement path only checked `Order.status`, so a late ZarinPal
 *      verification still flipped the cancelled order to `paid` — an order
 *      whose reservation the operator had abandoned.
 *
 * These run against the REAL database, because both properties are statements
 * about ROWS and about what two concurrent transactions leave behind, not about
 * control flow. `updateOrderFulfillmentStatus` / `settle*` open their OWN
 * transactions, so the rollback trick does not apply: every fixture COMMITS and
 * each test cleans up after itself.
 *
 * The only fake is the external ZarinPal `verify()` call — no network, no
 * sandbox credential, no money. The transaction, the guarded updates, the
 * release and the re-reservation all run for real.
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { cleanupStalePendingOrders } from "@/lib/orders/stale-cleanup";
import { ZarinPalError } from "@/lib/payments/zarinpal";
import {
  settlePayment,
  settleVerifiedPayment,
} from "@/lib/payments/settlement";
import {
  claimPendingOrder,
  InvalidOrderTransitionError,
  updateOrderFulfillmentStatus,
} from "@/lib/repositories/orders";
import { hasDatabaseUrl } from "@/tests/helpers/db";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/** The gateway verdict the test wants, set per test. */
const verifyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/payments/zarinpal", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/payments/zarinpal")>();
  return { ...actual, verify: verifyMock };
});

const describeDb = describe.skipIf(!hasDatabaseUrl);

/** A `categoryId` that exists in the seed — the product FK requires one. */
const SEED_CATEGORY_ID = "lighting";
/** See order-stock.test.ts — never sort a fixture ahead of real seed rows. */
const LEAKED_FIXTURE_SORT_ORDER = 9_999;

/** The stale sweep's own window; the fixtures that need it are backdated. */
const EXPIRATION_MINUTES = 1_440;

describeDb("cancelled orders and their stock reservation", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    verifyMock.mockReset();
  });

  /**
   * A committed product + order + item graph, plus its own bookkeeping.
   *
   * `reservationHeld` models the checkout-time claim by decrementing the shelf,
   * so the figures below read as "what the shelf holds while the order owns its
   * units". Pass `false` for the states whose reservation the payment axis
   * already returned (`failed`).
   */
  async function setUpOrder(opts: {
    productQuantity: number;
    orderedQuantity: number;
    status?: "pending" | "paid" | "failed" | "cancelled";
    fulfillmentStatus?:
      | "unfulfilled"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled";
    /** Default true — a `pending` order's reservation IS held. */
    reservationHeld?: boolean;
    /** Backdates `createdAt` so the stale sweep can consider the order. */
    createdMinutesAgo?: number;
  }) {
    const userId = (await prisma.user.findFirst({ select: { id: true } }))!.id;
    const authority = `ZF${randomUUID().replace(/-/g, "").toUpperCase()}`;

    const product = await prisma.product.create({
      data: {
        id: randomUUID(),
        slug: `cancel-test-${randomUUID()}`,
        name: { en: "Cancel Test", fa: "تست لغو" },
        hoverImage: "/test-hover.jpg",
        heroImage: "/test-hero.jpg",
        priceEur: 10,
        priceToman: 1_000_000,
        existsInStore: true,
        quantity: opts.productQuantity,
        description: { en: "d", fa: "د" },
        downloads: [],
        related: [],
        sortOrder: LEAKED_FIXTURE_SORT_ORDER,
        categoryId: SEED_CATEGORY_ID,
      },
    });

    const order = await prisma.order.create({
      data: {
        id: randomUUID(),
        userId,
        status: opts.status ?? "pending",
        fulfillmentStatus: opts.fulfillmentStatus ?? "unfulfilled",
        totalAmount: 1_000_000,
        currency: "TOMAN",
        // Stored because settlement resolves the order FROM THE AUTHORITY; a
        // fixture without one is unreachable.
        zarinpalAuthority: authority,
        recipientName: "Test",
        phone: "09120000000",
        addressLine: "Line",
        city: "City",
        postalCode: "1234567890",
        ...(opts.createdMinutesAgo
          ? {
              createdAt: new Date(Date.now() - opts.createdMinutesAgo * 60_000),
            }
          : {}),
      },
    });

    await prisma.orderItem.create({
      data: {
        id: randomUUID(),
        orderId: order.id,
        productId: product.id,
        quantity: opts.orderedQuantity,
        unitPriceAtPurchase: 1_000_000,
        name: { en: "Cancel Test", fa: "تست لغو" },
        image: "/test-hero.jpg",
      },
    });

    if (opts.reservationHeld ?? true) {
      await prisma.product.update({
        where: { id: product.id },
        data: { quantity: { decrement: opts.orderedQuantity } },
      });
    }

    async function cleanup() {
      await prisma.orderItem
        .deleteMany({ where: { orderId: order.id } })
        .catch(() => {});
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
    }

    /** Reads the durable state a customer/admin would see. */
    async function read() {
      const [orderRow, productRow] = await Promise.all([
        prisma.order.findUnique({
          where: { id: order.id },
          select: { status: true, fulfillmentStatus: true },
        }),
        prisma.product.findUnique({
          where: { id: product.id },
          select: { quantity: true },
        }),
      ]);
      return { order: orderRow!, product: productRow! };
    }

    return { product, order, authority, cleanup, read };
  }

  const success = (refId = "REF-CANCEL") =>
    verifyMock.mockResolvedValue({ code: 100, message: "Verified", refId });

  // ---------------------------------------------------------------------------
  // 1 — cancelling an unpaid order returns the reservation
  // ---------------------------------------------------------------------------

  it("returns the reservation when an unpaid pending order is cancelled", async () => {
    // shelf 10 -> 8 when the order is created, so its 2 units are held.
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
    });

    try {
      await updateOrderFulfillmentStatus(order.id, "cancelled");

      const after = await read();
      // The cancellation is written on the FULFILMENT axis only.
      expect(after.order.fulfillmentStatus).toBe("cancelled");
      expect(after.order.status).toBe("pending");
      // 8 + 2 = 10: the reservation came back exactly once.
      expect(after.product.quantity).toBe(10);
    } finally {
      await cleanup();
    }
  });

  it("releases the reservation only once when the cancellation is repeated", async () => {
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
    });

    try {
      await updateOrderFulfillmentStatus(order.id, "cancelled");
      // A same-state submit is a no-op, not an error — and must move no stock.
      await expect(
        updateOrderFulfillmentStatus(order.id, "cancelled"),
      ).resolves.toBeUndefined();
      await expect(
        updateOrderFulfillmentStatus(order.id, "cancelled"),
      ).resolves.toBeUndefined();

      const after = await read();
      // 10, never 12: a second release would inflate the shelf.
      expect(after.product.quantity).toBe(10);
      expect(after.order.fulfillmentStatus).toBe("cancelled");
    } finally {
      await cleanup();
    }
  });

  it("releases the reservation once when two cancellations run concurrently", async () => {
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
    });

    try {
      const results = await Promise.allSettled([
        updateOrderFulfillmentStatus(order.id, "cancelled"),
        updateOrderFulfillmentStatus(order.id, "cancelled"),
      ]);

      // One winner. The loser either read the already-cancelled state (a no-op)
      // or lost the guarded update, which is refused rather than retried.
      expect(results.some((r) => r.status === "fulfilled")).toBe(true);
      for (const result of results) {
        if (result.status === "rejected") {
          expect(result.reason).toBeInstanceOf(InvalidOrderTransitionError);
        }
      }

      const after = await read();
      expect(after.product.quantity).toBe(10);
      expect(after.order.fulfillmentStatus).toBe("cancelled");
    } finally {
      await cleanup();
    }
  });

  // ---------------------------------------------------------------------------
  // 2 — a cancelled order can never be settled
  // ---------------------------------------------------------------------------

  it("refuses to settle a cancelled order through the payment callback", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
    });

    try {
      await updateOrderFulfillmentStatus(order.id, "cancelled");

      success();
      const outcome = await settlePayment({ authority, orderIdHint: order.id });

      // The order is refused, and it is refused BEFORE the gateway is asked:
      // a cancelled order has nothing left to settle against.
      expect(outcome.kind).toBe("cancelled");
      expect(verifyMock).not.toHaveBeenCalled();

      const after = await read();
      expect(after.order.status).toBe("pending");
      expect(after.order.fulfillmentStatus).toBe("cancelled");
      // No re-reservation either: the shelf is exactly what the cancellation
      // restored — never 8 (phantom claim) and never 12 (double release).
      expect(after.product.quantity).toBe(10);
    } finally {
      await cleanup();
    }
  });

  it("refuses a direct post-verify settlement of a cancelled order", async () => {
    // The second half of the guard: even when verification already happened (or
    // a caller drives `settleVerifiedPayment` straight), the write is refused.
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
    });

    try {
      await updateOrderFulfillmentStatus(order.id, "cancelled");

      const outcome = await settleVerifiedPayment({
        orderId: order.id,
        refId: "REF-LATE",
      });

      expect(outcome.kind).toBe("cancelled");

      const after = await read();
      expect(after.order.status).toBe("pending");
      expect(after.product.quantity).toBe(10);
    } finally {
      await cleanup();
    }
  });

  it("refuses a decline callback's failure transition on a cancelled order", async () => {
    // `failed` RELEASES the reservation. A decline arriving after the
    // cancellation already returned it must not credit the shelf again.
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
    });

    try {
      await updateOrderFulfillmentStatus(order.id, "cancelled");

      const { changed } = await claimPendingOrder({
        orderId: order.id,
        status: "failed",
      });

      expect(changed).toBe(false);

      const after = await read();
      expect(after.order.status).toBe("pending");
      expect(after.order.fulfillmentStatus).toBe("cancelled");
      // Still 10 — a second release would make it 12.
      expect(after.product.quantity).toBe(10);
    } finally {
      await cleanup();
    }
  });

  // ---------------------------------------------------------------------------
  // 3 — cancellation vs settlement race
  // ---------------------------------------------------------------------------

  it("leaves exactly one valid state when a cancellation races a settlement", async () => {
    // Repeated so both interleavings get a chance: whichever transaction
    // updates the order row first holds the row lock, and the other re-evaluates
    // its own WHERE clause against the committed state.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const productQuantity = 10;
      const orderedQuantity = 2;
      const reservedShelf = productQuantity - orderedQuantity;
      const { order, cleanup, read } = await setUpOrder({
        productQuantity,
        orderedQuantity,
      });

      try {
        await Promise.allSettled([
          updateOrderFulfillmentStatus(order.id, "cancelled"),
          settleVerifiedPayment({
            orderId: order.id,
            refId: `REF-RACE-${attempt}`,
          }),
        ]);

        const after = await read();

        // One of the two sides must have won.
        expect(
          after.order.status === "paid" ||
            after.order.fulfillmentStatus === "cancelled",
        ).toBe(true);

        // Never a double release and never a phantom claim.
        expect([reservedShelf, productQuantity]).toContain(
          after.product.quantity,
        );

        if (after.order.status === "paid") {
          // The payment won: the goods are owed, so the reservation is STILL
          // held — the cancellation (if it landed afterwards) released nothing.
          expect(after.product.quantity).toBe(reservedShelf);
        } else {
          // The cancellation won: the payment must not have been recorded, and
          // the reservation came back exactly once.
          expect(after.order.fulfillmentStatus).toBe("cancelled");
          expect(after.product.quantity).toBe(productQuantity);
        }
      } finally {
        await cleanup();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 4 — the stale sweep must not double-release
  // ---------------------------------------------------------------------------

  it("never lets the stale sweep release a cancelled order's stock again", async () => {
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
      // Old enough for the sweep's 24-hour window.
      createdMinutesAgo: EXPIRATION_MINUTES * 2,
    });

    try {
      await updateOrderFulfillmentStatus(order.id, "cancelled");

      const now = new Date();
      const cutoff = new Date(now.getTime() - EXPIRATION_MINUTES * 60_000);

      // The sweep's own SELECTION cannot see the order any more: its query
      // requires `unfulfilled`.
      const selected = await prisma.order.findMany({
        where: {
          status: "pending",
          fulfillmentStatus: "unfulfilled",
          createdAt: { lt: cutoff },
        },
        select: { id: true },
      });
      expect(selected.map((row) => row.id)).not.toContain(order.id);

      // And the final GUARD refuses it even if a scan had seen it earlier.
      const { changed } = await claimPendingOrder({
        orderId: order.id,
        status: "failed",
        staleBefore: cutoff,
        txOptions: { maxWait: 30_000, timeout: 30_000 },
      });
      expect(changed).toBe(false);

      // The sweep itself, run for real. (Only OUR fixture's outcome is asserted:
      // this shares the dev database with other rows the sweep may legitimately
      // process.)
      await cleanupStalePendingOrders({
        now,
        config: { expirationMinutes: EXPIRATION_MINUTES, batchSize: 25 },
      });

      const after = await read();
      expect(after.order.status).toBe("pending");
      expect(after.order.fulfillmentStatus).toBe("cancelled");
      // Exactly one release, ever.
      expect(after.product.quantity).toBe(10);
    } finally {
      await cleanup();
    }
  });

  // ---------------------------------------------------------------------------
  // 5 — a PAID order is untouched
  // ---------------------------------------------------------------------------

  it("does not return a PAID order's stock when its fulfilment is cancelled", async () => {
    // shelf 10 -> 8: the paid order owns those 2 units.
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
      status: "paid",
    });

    try {
      await updateOrderFulfillmentStatus(order.id, "cancelled");

      const after = await read();
      // `Order.status` is never written by an admin action.
      expect(after.order.status).toBe("paid");
      expect(after.order.fulfillmentStatus).toBe("cancelled");
      // 8: the goods are owed, so the ordered inventory stays accounted for
      // exactly once. Returning it would invent a refund this project has no
      // mechanism for.
      expect(after.product.quantity).toBe(8);
    } finally {
      await cleanup();
    }
  });

  it("leaves a paid order's stock alone on a repeat cancellation", async () => {
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
      status: "paid",
    });

    try {
      await updateOrderFulfillmentStatus(order.id, "cancelled");
      await expect(
        updateOrderFulfillmentStatus(order.id, "cancelled"),
      ).resolves.toBeUndefined();

      const after = await read();
      expect(after.product.quantity).toBe(8);
      expect(after.order.status).toBe("paid");
    } finally {
      await cleanup();
    }
  });

  // ---------------------------------------------------------------------------
  // 6 — the ordinary paths are unchanged
  // ---------------------------------------------------------------------------

  it("still settles an ordinary pending order to paid, keeping its reservation", async () => {
    // The regression guard: the cancellation refusals must not have made every
    // order unsettleable.
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
    });

    try {
      success("REF-OK");
      const outcome = await settlePayment({ authority, orderIdHint: order.id });

      expect(outcome.kind).toBe("paid");

      const after = await read();
      expect(after.order.status).toBe("paid");
      expect(after.order.fulfillmentStatus).toBe("unfulfilled");
      // 8: the goods are owed, so no release and no second claim.
      expect(after.product.quantity).toBe(8);
    } finally {
      await cleanup();
    }
  });

  it("still declines a pending order, releasing its reservation once", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 10,
      orderedQuantity: 2,
    });

    try {
      verifyMock.mockRejectedValue(
        new ZarinPalError("rejected", "Transaction failed", -51),
      );

      const outcome = await settlePayment({ authority, orderIdHint: order.id });

      expect(outcome.kind).toBe("failed");
      expect(outcome).toMatchObject({ changed: true });

      const after = await read();
      expect(after.order.status).toBe("failed");
      expect(after.order.fulfillmentStatus).toBe("unfulfilled");
      // 8 + 2 = 10: the decline returned the reservation exactly once.
      expect(after.product.quantity).toBe(10);
    } finally {
      await cleanup();
    }
  });
});
