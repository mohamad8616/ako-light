/**
 * Payment settlement against the REAL database — the stock invariant.
 *
 * This is the tier that can actually prove the acceptance criteria for Pass
 * 14.5, because they are statements about ROWS, not about control flow:
 *
 *   paid order ↔ its ordered stock is accounted for exactly once
 *
 * Every test here drives `settlePayment` / `settleVerifiedPayment` with the
 * gateway `verify()` call MOCKED (no network, no sandbox credential, no money) —
 * the only faked thing is the external verdict. The transaction, the guarded
 * update, the re-reservation and the release all run for real.
 *
 * Unlike the suites that use the rollback trick, settlement opens its OWN
 * transaction, so its writes must COMMIT to be observable. Each test therefore
 * cleans up after itself.
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { ZarinPalError } from "@/lib/payments/zarinpal";
import { hasDatabaseUrl } from "@/tests/helpers/db";
import { TX_OPTIONS } from "@/tests/helpers/tx";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/** The gateway verdict the test wants, set per test. */
const verifyMock = vi.hoisted(() => vi.fn());

// The ONLY fake: the external ZarinPal verify call. Everything else is real —
// the transaction, the guarded update, the re-reservation and the release.
vi.mock("@/lib/payments/zarinpal", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/payments/zarinpal")>();
  return { ...actual, verify: verifyMock };
});

import {
  settlePayment,
  settleVerifiedPayment,
} from "@/lib/payments/settlement";

const describeDb = describe.skipIf(!hasDatabaseUrl);

/** A `categoryId` that exists in the seed — the product FK requires one. */
const SEED_CATEGORY_ID = "lighting";
const LEAKED_FIXTURE_SORT_ORDER = 9_999;

/**
 * A committed product + order + item graph, plus its own bookkeeping.
 *
 * `zarinpalAuthority` is stored on the order because settlement resolves the
 * order FROM THE AUTHORITY — a fixture without one is unreachable, which is
 * itself the property the callback tests below rely on.
 */
async function setUpOrder(opts: {
  productQuantity: number;
  orderedQuantity: number;
  status?: "pending" | "paid" | "failed" | "cancelled";
  /**
   * Model the checkout-time reservation: decrement the shelf by the ordered
   * quantity. Use for `pending` orders (the reservation IS held). For a
   * `failed` order the reservation has already been released, so leave this
   * unset — the shelf figure is what the re-reservation must draw from.
   */
  reservationHeld?: boolean;
}) {
  const userId = (await prisma.user.findFirst({ select: { id: true } }))!.id;
  const authority = `ZF${randomUUID().replace(/-/g, "").toUpperCase()}`;

  const product = await prisma.product.create({
    data: {
      id: randomUUID(),
      slug: `settle-test-${randomUUID()}`,
      name: { en: "Settle Test", fa: "تست تسویه" },
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
      totalAmount: 1_000_000,
      currency: "TOMAN",
      zarinpalAuthority: authority,
      recipientName: "Test",
      phone: "09120000000",
      addressLine: "Line",
      city: "City",
      postalCode: "1234567890",
    },
  });

  await prisma.orderItem.create({
    data: {
      id: randomUUID(),
      orderId: order.id,
      productId: product.id,
      quantity: opts.orderedQuantity,
      unitPriceAtPurchase: 1_000_000,
      name: { en: "Settle Test", fa: "تست تسویه" },
      image: "/test-hero.jpg",
    },
  });

  // `productQuantity` is the quantity ON THE SHELF at settle time. A pending
  // order's reservation was claimed at creation, so `reservationHeld` models
  // that claim by decrementing (the shelf figure passed in is pre-claim). A
  // `failed` order's reservation was RELEASED by the failure transition, so
  // nothing is decremented — which is exactly the stale-sweep state this pass
  // must reconcile.
  if (opts.reservationHeld) {
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
        select: { status: true, zarinpalRefId: true },
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

const success = (refId = "REF-1") =>
  verifyMock.mockResolvedValue({ code: 100, message: "Verified", refId });

const declined = () =>
  verifyMock.mockRejectedValue(
    new ZarinPalError("rejected", "Transaction failed", -51),
  );

const noVerdict = () =>
  verifyMock.mockRejectedValue(
    new ZarinPalError("gateway", "Could not reach ZarinPal: network error"),
  );

describeDb("payment settlement", () => {
  beforeEach(() => {
    verifyMock.mockReset();
  });

  it("can reach the database", async () => {
    const u = await prisma.user.findFirst({ select: { id: true } });
    expect(u).not.toBeNull();
  });

  it("does not reach the gateway for an order id that does not exist", async () => {
    const outcome = await settleVerifiedPayment({
      orderId: randomUUID(),
      refId: "R0",
    });
    expect(outcome.kind).toBe("error");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------
  // Normal verification
  // -------------------------------------------------------------------------

  it("settles a valid pending order to paid, with the reference stored", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 5,
      orderedQuantity: 2,
      // The checkout claimed the reservation at creation: 5 → 3 on the shelf.
      reservationHeld: true,
    });

    try {
      success("REF-OK");
      const outcome = await settlePayment({ authority, orderIdHint: order.id });

      expect(outcome.kind).toBe("paid");
      const after = await read();
      expect(after.order.status).toBe("paid");
      expect(after.order.zarinpalRefId).toBe("REF-OK");
      // Stock stays claimed — the goods are owed, so NO release and NO claim.
      expect(after.product.quantity).toBe(3);
    } finally {
      await cleanup();
    }
  });

  it("uses the order's STORED total as the verification amount", async () => {
    const { authority, order, cleanup } = await setUpOrder({
      productQuantity: 3,
      orderedQuantity: 1,
    });

    try {
      success();
      await settlePayment({ authority, orderIdHint: order.id });

      expect(verifyMock).toHaveBeenCalledTimes(1);
      expect(verifyMock).toHaveBeenCalledWith({
        authority,
        amountToman: 1_000_000,
      });
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // Authority / association
  // -------------------------------------------------------------------------

  it("rejects an authority that belongs to no order without touching anything", async () => {
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 4,
      orderedQuantity: 1,
    });

    try {
      const outcome = await settlePayment({
        authority: "ZF00000000000000000000000000000000",
        orderIdHint: "ignored",
      });

      expect(outcome.kind).toBe("unknownAuthority");
      // The gateway must not even be asked about an authority we cannot place.
      expect(verifyMock).not.toHaveBeenCalled();
      const after = await read();
      expect(after.order.status).toBe("pending");
      expect(after.product.quantity).toBe(4);
      void order;
    } finally {
      await cleanup();
    }
  });

  it("rejects an orderId that names a DIFFERENT order than the authority", async () => {
    // The attack: the authority is genuine, the orderId is someone else's. Both
    // orders must be left untouched and no stock moved.
    const a = await setUpOrder({ productQuantity: 4, orderedQuantity: 1 });
    const b = await setUpOrder({ productQuantity: 4, orderedQuantity: 1 });

    try {
      success();
      const outcome = await settlePayment({
        authority: a.authority,
        orderIdHint: b.order.id,
      });

      expect(outcome.kind).toBe("mismatch");
      expect(verifyMock).not.toHaveBeenCalled();

      const afterA = await a.read();
      const afterB = await b.read();
      expect(afterA.order.status).toBe("pending");
      expect(afterB.order.status).toBe("pending");
      expect(afterA.product.quantity).toBe(4);
      expect(afterB.product.quantity).toBe(4);
    } finally {
      await a.cleanup();
      await b.cleanup();
    }
  });

  it("rejects a malformed authority before any database lookup", async () => {
    const { order, cleanup } = await setUpOrder({
      productQuantity: 2,
      orderedQuantity: 1,
    });

    try {
      const outcome = await settlePayment({
        authority: "not-an-authority",
        orderIdHint: order.id,
      });
      expect(outcome.kind).toBe("unknownAuthority");
      expect(verifyMock).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  it("is idempotent: three verifications of one order settle exactly once", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 5,
      orderedQuantity: 2,
      status: "paid",
    });

    try {
      success();
      const first = await settlePayment({ authority, orderIdHint: order.id });
      const second = await settlePayment({ authority, orderIdHint: order.id });
      const third = await settlePayment({ authority, orderIdHint: order.id });

      expect(first.kind).toBe("alreadyPaid");
      expect(second.kind).toBe("alreadyPaid");
      expect(third.kind).toBe("alreadyPaid");
      // An already-settled order is returned WITHOUT re-verifying, so no
      // duplicate gateway call, no stock movement and no second reference.
      expect(verifyMock).not.toHaveBeenCalled();

      const after = await read();
      expect(after.order.status).toBe("paid");
      expect(after.product.quantity).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("does not resurrect a CANCELLED order into paid", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 5,
      orderedQuantity: 2,
      status: "cancelled",
    });

    try {
      success();
      const outcome = await settlePayment({ authority, orderIdHint: order.id });

      expect(outcome.kind).toBe("cancelled");
      expect(verifyMock).not.toHaveBeenCalled();
      const after = await read();
      expect(after.order.status).toBe("cancelled");
      expect(after.product.quantity).toBe(5);
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // THE STALE-ORDER RACE — mandatory
  // -------------------------------------------------------------------------

  it("re-reserves stock when a failed order's reservation was released (stale sweep)", async () => {
    // The exact Pass 15.5 sequence: pending → (24h) → failed, stock released.
    // Then a DELAYED successful verification arrives.
    const { order, authority, cleanup, read } = await setUpOrder({
      // 3 on the shelf (the sweep already returned the reservation): enough to
      // satisfy the 2-unit re-reservation.
      productQuantity: 3,
      orderedQuantity: 2,
      status: "failed",
    });

    try {
      success("REF-LATE");
      const outcome = await settlePayment({ authority, orderIdHint: order.id });

      // Paid AND holding the inventory — never paid with phantom stock.
      expect(outcome.kind).toBe("paid");

      const after = await read();
      expect(after.order.status).toBe("paid");
      expect(after.order.zarinpalRefId).toBe("REF-LATE");
      // 3 − 2 = 1: the reservation is re-established exactly once.
      expect(after.product.quantity).toBe(1);
    } finally {
      await cleanup();
    }
  });

  it("does NOT mark a failed order paid when its stock can no longer be re-reserved", async () => {
    // Same stale sequence, but the shelf is empty. A successful payment must NOT
    // create an order that claims inventory it does not have.
    const { order, authority, cleanup, read } = await setUpOrder({
      // Nothing left on the shelf: the re-reservation cannot be satisfied.
      productQuantity: 0,
      orderedQuantity: 2,
      status: "failed",
    });

    try {
      success();
      const outcome = await settlePayment({ authority, orderIdHint: order.id });

      expect(outcome.kind).toBe("manualReview");

      const after = await read();
      // The order stays failed — NOT paid — and stock is untouched.
      expect(after.order.status).toBe("failed");
      expect(after.order.zarinpalRefId).toBeNull();
      expect(after.product.quantity).toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("does not partially decrement stock when one line cannot be re-reserved", async () => {
    // Two lines: one satisfiable, one not. The whole re-reservation must roll
    // back, or the first line would silently lose stock it never re-held.
    const { product, order, authority, cleanup } = await setUpOrder({
      productQuantity: 5,
      orderedQuantity: 1,
      status: "failed",
    });

    const second = await prisma.product.create({
      data: {
        id: randomUUID(),
        slug: `settle-test-${randomUUID()}`,
        name: { en: "Second", fa: "دوم" },
        hoverImage: "/t.jpg",
        heroImage: "/t.jpg",
        priceEur: 10,
        priceToman: 1_000_000,
        existsInStore: true,
        quantity: 0,
        description: { en: "d", fa: "د" },
        downloads: [],
        related: [],
        sortOrder: LEAKED_FIXTURE_SORT_ORDER,
        categoryId: SEED_CATEGORY_ID,
      },
    });

    await prisma.orderItem.create({
      data: {
        id: randomUUID(),
        orderId: order.id,
        productId: second.id,
        quantity: 1,
        unitPriceAtPurchase: 1_000_000,
        name: { en: "Second", fa: "دوم" },
        image: "/t.jpg",
      },
    });

    try {
      success();
      const outcome = await settlePayment({ authority, orderIdHint: order.id });
      expect(outcome.kind).toBe("manualReview");

      const [firstAfter, secondAfter, orderAfter] = await Promise.all([
        prisma.product.findUnique({
          where: { id: product.id },
          select: { quantity: true },
        }),
        prisma.product.findUnique({
          where: { id: second.id },
          select: { quantity: true },
        }),
        prisma.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        }),
      ]);

      expect(orderAfter!.status).toBe("failed");
      // The satisfiable line must NOT have been decremented.
      expect(firstAfter!.quantity).toBe(5);
      expect(secondAfter!.quantity).toBe(0);
    } finally {
      await prisma.orderItem
        .deleteMany({ where: { orderId: order.id } })
        .catch(() => {});
      await prisma.product.delete({ where: { id: second.id } }).catch(() => {});
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // Failure verdicts
  // -------------------------------------------------------------------------

  it("records a genuine decline as failed and releases the reservation once", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 5,
      orderedQuantity: 2,
      // The checkout claimed the reservation: 5 → 3 on the shelf.
      reservationHeld: true,
    });

    try {
      declined();
      const outcome = await settlePayment({ authority, orderIdHint: order.id });
      expect(outcome.kind).toBe("failed");

      const after = await read();
      expect(after.order.status).toBe("failed");
      // 3 + 2 = 5: the claim is released exactly once.
      expect(after.product.quantity).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("leaves the order UNCHANGED when the gateway gives no verdict", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 5,
      orderedQuantity: 2,
      reservationHeld: true,
    });

    try {
      noVerdict();
      const outcome = await settlePayment({ authority, orderIdHint: order.id });

      expect(outcome.kind).toBe("unconfirmed");
      const after = await read();
      // Still pending, reservation still held — recoverable by a later attempt.
      expect(after.order.status).toBe("pending");
      expect(after.product.quantity).toBe(3);
    } finally {
      await cleanup();
    }
  });

  it("never downgrades a paid order on a failure verdict", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 3,
      orderedQuantity: 1,
      status: "paid",
    });

    try {
      declined();
      const outcome = await settlePayment({ authority, orderIdHint: order.id });
      // Already settled successfully: the decline is ignored entirely.
      expect(outcome.kind).toBe("alreadyPaid");
      expect(verifyMock).not.toHaveBeenCalled();

      const after = await read();
      expect(after.order.status).toBe("paid");
      expect(after.product.quantity).toBe(3);
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // Concurrency
  // -------------------------------------------------------------------------

  it("settles once when two verifications run CONCURRENTLY", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 5,
      orderedQuantity: 2,
      reservationHeld: true,
    });

    try {
      success("REF-RACE");
      const [a, b] = await Promise.all([
        settlePayment({ authority, orderIdHint: order.id }),
        settlePayment({ authority, orderIdHint: order.id }),
      ]);

      // Exactly one settlement; the other is an idempotent no-op (it either saw
      // paid up front or lost the guarded update and rolled back).
      const paid = [a, b].filter((o) => o.kind === "paid");
      expect(paid).toHaveLength(1);
      expect(
        [a, b].every((o) => o.kind === "paid" || o.kind === "alreadyPaid"),
      ).toBe(true);

      const after = await read();
      expect(after.order.status).toBe("paid");
      expect(after.order.zarinpalRefId).toBe("REF-RACE");
      // Stock moved exactly once — never double-decremented.
      expect(after.product.quantity).toBe(3);
    } finally {
      await cleanup();
    }
  });

  it("re-reserves exactly once when two verifications of a stale order race", async () => {
    // The nastiest interleaving: two late successes on a failed order whose
    // reservation was released. Exactly one re-reservation may land.
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 4,
      orderedQuantity: 2,
      status: "failed",
    });

    try {
      success("REF-C");
      const results = await Promise.all([
        settlePayment({ authority, orderIdHint: order.id }),
        settlePayment({ authority, orderIdHint: order.id }),
      ]);

      const paid = results.filter((o) => o.kind === "paid");
      expect(paid).toHaveLength(1);

      const after = await read();
      expect(after.order.status).toBe("paid");
      // 4 − 2 = 2. A second re-reservation would give 0; a leaked rollback
      // would give 4.
      expect(after.product.quantity).toBe(2);
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // settleVerifiedPayment — the post-verify half, driven directly
  // -------------------------------------------------------------------------

  it("settles a pending order directly and stores the reference", async () => {
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 3,
      orderedQuantity: 1,
    });

    try {
      const outcome = await settleVerifiedPayment({
        orderId: order.id,
        refId: "R2",
      });
      expect(outcome.kind).toBe("paid");

      const after = await read();
      expect(after.order.status).toBe("paid");
      expect(after.order.zarinpalRefId).toBe("R2");
      expect(after.product.quantity).toBe(3);
    } finally {
      await cleanup();
    }
  });

  it("treats a settled order as a safe no-op when driven again", async () => {
    const { order, cleanup, read } = await setUpOrder({
      productQuantity: 3,
      orderedQuantity: 1,
      status: "paid",
    });

    try {
      const outcome = await settleVerifiedPayment({
        orderId: order.id,
        refId: "R3",
      });
      expect(outcome.kind).toBe("alreadyPaid");

      const after = await read();
      // The later reference does NOT overwrite the settled one.
      expect(after.order.zarinpalRefId).toBeNull();
      expect(after.product.quantity).toBe(3);
    } finally {
      await cleanup();
    }
  });

  it("reports an error for an order id that does not exist", async () => {
    const outcome = await settleVerifiedPayment({
      orderId: randomUUID(),
      refId: "R4",
    });
    expect(outcome.kind).toBe("error");
  });

  // -------------------------------------------------------------------------
  // The invariant, stated directly
  // -------------------------------------------------------------------------

  it("holds: a paid order's stock is accounted for exactly once", async () => {
    const { order, authority, cleanup, read } = await setUpOrder({
      productQuantity: 6,
      orderedQuantity: 2,
      // The checkout claimed the reservation: 6 → 4 on the shelf.
      reservationHeld: true,
    });

    try {
      success();
      await settlePayment({ authority, orderIdHint: order.id });
      // Duplicate deliveries must not move it again.
      await settlePayment({ authority, orderIdHint: order.id });
      await settlePayment({ authority, orderIdHint: order.id });

      const orderAfter = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      const { product: productAfter } = await read();

      expect(orderAfter!.status).toBe("paid");
      // 6 − 2 = 4: exactly one reservation held against exactly one paid order.
      expect(productAfter.quantity).toBe(4);
    } finally {
      await cleanup();
    }
  });
});

void TX_OPTIONS;
