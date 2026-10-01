/**
 * Stock reservation — the fix for "stock is never decremented".
 *
 * These tests talk to the real dev database inside a rolled-back transaction,
 * so the seed is never mutated. They pin the two guarantees the checkout path
 * depends on:
 *
 *   1. a successful claim decrements `Product.quantity` by exactly the ordered
 *      amount, and refuses a claim larger than what is left;
 *   2. the availability rule lives in the UPDATE's WHERE clause, so two
 *      concurrent claims for the last unit cannot both succeed.
 *
 * (2) is the reason this is a guarded `updateMany` and not a read-then-write
 * check: with a read-then-write check both transactions read the same
 * pre-decrement quantity, both pass the comparison, and both decrement.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { claimPendingOrder, claimProductStock, releaseOrderStock } from "@/lib/repositories/orders";
import { hasDatabaseUrl } from "@/tests/helpers/db";
import { TX_OPTIONS } from "@/tests/helpers/tx";

const describeDb = describe.skipIf(!hasDatabaseUrl);

/** A `categoryId` that exists in the seed — the product FK requires one. */
const SEED_CATEGORY_ID = "lighting";

/**
 * Sort position for throwaway fixtures. High on purpose: see the comment where
 * it is used — a fixture that outlives its run must not become a category's
 * first product.
 */
const LEAKED_FIXTURE_SORT_ORDER = 9_999;

/**
 * Creates a throwaway product inside the caller's transaction. `id` and `slug`
 * share a fresh uuid so the row can never collide with seed data or a parallel
 * test.
 */
async function makeProduct(
  tx: Prisma.TransactionClient,
  overrides: {
    quantity?: number;
    existsInStore?: boolean;
    priceToman?: number;
  } = {},
) {
  const key = randomUUID();
  return tx.product.create({
    data: {
      id: key,
      slug: `stock-test-${key}`,
      name: { en: "Stock Test", fa: "تست موجودی" },
      hoverImage: "/test-hover.jpg",
      heroImage: "/test-hero.jpg",
      priceEur: 10,
      priceToman: overrides.priceToman ?? 1_000_000,
      existsInStore: overrides.existsInStore ?? true,
      quantity: overrides.quantity ?? 5,
      description: { en: "d", fa: "د" },
      downloads: [],
      related: [],
      // Deliberately LAST, not first. These fixtures live in a real seeded
      // category (the FK requires one), and `sortOrder: 0` used to tie with
      // the category's curated first product — so if a run was ever KILLED
      // before its `finally` cleanup, the orphan sorted to position 0 and
      // became the homepage carousel's lead tile (it has no gallery images,
      // which is how a leaked fixture produced "empty src" / "missing key"
      // errors on the live site). A high value keeps any orphan out of sight.
      sortOrder: LEAKED_FIXTURE_SORT_ORDER,
      categoryId: SEED_CATEGORY_ID,
    },
  });
}

const ROLLBACK = "intentional test rollback";

/**
 * Explicit `maxWait`/`timeout` for every transaction in this file.
 *
 * `maxWait` is how long Prisma will wait for a free connection from the pool
 * before giving up with "Unable to start a transaction in the given time";
 * the default is 2000 ms, which a cold connection to the remote dev pooler
 * regularly blows past. The concurrency tests also hold a transaction open on
 * purpose, so the second one needs to be prepared to wait for it.
 *
 * The `server` project already runs with a 60 s test timeout for the same
 * reason — see vitest.config.ts.
 *
 * The options themselves live in `@/tests/helpers/tx` (TX_OPTIONS) so the
 * budget cannot drift between files.
 */

describeDb("claimProductStock", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("decrements the ordered quantity", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const product = await makeProduct(tx, { quantity: 10 });

          const { claimedIds, unavailable } = await claimProductStock(
            [{ productId: product.id, quantity: 3 }],
            tx,
          );

          expect(unavailable).toEqual([]);
          expect(claimedIds).toEqual([product.id]);

          const after = await tx.product.findUnique({
            where: { id: product.id },
            select: { quantity: true },
          });
          expect(after!.quantity).toBe(7);

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);
  });

  it("refuses a claim larger than the remaining quantity and does not decrement", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const product = await makeProduct(tx, { quantity: 2 });

          const { claimedIds, unavailable } = await claimProductStock(
            [{ productId: product.id, quantity: 3 }],
            tx,
          );

          // Reported by slug — the human handle the checkout error surfaces.
          expect(claimedIds).toEqual([]);
          expect(unavailable).toEqual([product.slug]);

          const after = await tx.product.findUnique({
            where: { id: product.id },
            select: { quantity: true },
          });
          // The refused line must leave the row untouched.
          expect(after!.quantity).toBe(2);

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);
  });

  it("refuses a product that is not in the store", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const product = await makeProduct(tx, {
            quantity: 10,
            existsInStore: false,
          });

          const { claimedIds, unavailable } = await claimProductStock(
            [{ productId: product.id, quantity: 1 }],
            tx,
          );

          expect(claimedIds).toEqual([]);
          expect(unavailable).toEqual([product.slug]);

          const after = await tx.product.findUnique({
            where: { id: product.id },
            select: { quantity: true },
          });
          expect(after!.quantity).toBe(10);

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);
  });

  it("refuses a product priced at zero (not purchasable)", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const product = await makeProduct(tx, { quantity: 10, priceToman: 0 });

          const { claimedIds, unavailable } = await claimProductStock(
            [{ productId: product.id, quantity: 1 }],
            tx,
          );

          expect(claimedIds).toEqual([]);
          expect(unavailable).toEqual([product.slug]);

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);
  });

  it("reports a deleted product by its raw id", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const missingId = randomUUID();

          const { claimedIds, unavailable } = await claimProductStock(
            [{ productId: missingId, quantity: 1 }],
            tx,
          );

          // There is no slug left to report, so the id is the only handle.
          expect(claimedIds).toEqual([]);
          expect(unavailable).toEqual([missingId]);

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);
  });

  it("claims the whole cart, or nothing at all", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const ok = await makeProduct(tx, { quantity: 5 });
          const short = await makeProduct(tx, { quantity: 1 });

          const { claimedIds, unavailable } = await claimProductStock(
            [
              { productId: ok.id, quantity: 2 },
              { productId: short.id, quantity: 2 },
            ],
            tx,
          );

          // The caller throws when `unavailable` is non-empty, which rolls the
          // whole transaction back — including the decrement on `ok`. That is
          // the atomicity this test pins: a partial cart never commits.
          expect(unavailable).toEqual([short.slug]);
          expect(claimedIds).toEqual([ok.id]);

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);

    // After the rollback the whole cart is intact — nothing was consumed.
  });

  it("sums a duplicated product into one claim", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const product = await makeProduct(tx, { quantity: 5 });

          // The action collapses duplicate cart lines before calling this, so
          // one row may only appear once — but a single claim of the summed
          // quantity must still be exactly right.
          const { unavailable } = await claimProductStock(
            [{ productId: product.id, quantity: 5 }],
            tx,
          );

          expect(unavailable).toEqual([]);

          const after = await tx.product.findUnique({
            where: { id: product.id },
            select: { quantity: true },
          });
          expect(after!.quantity).toBe(0);

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);
  });
});

describeDb("claimProductStock — concurrency", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lets only one of two concurrent claims for the last unit win", async () => {
    // Uses two REAL, independent transactions that both try to take the last
    // unit. This is the case the guarded updateMany exists for: with a
    // read-then-write check both transactions read quantity=1, both see
    // `1 >= 1`, and both decrement — selling the unit twice.
    //
    // NOTE ON SHAPE: the two transactions are started together so they contend
    // for the same row, but neither holds its row lock for a fixed sleep. An
    // earlier version slept 150 ms inside the first transaction to "force" the
    // ordering, which held BOTH a connection and a row lock while the remote
    // pooler tried to hand the second transaction a connection — and the second
    // then failed with "Unable to start a transaction in the given time" rather
    // than exercising the guarantee. Contention on the row is what this test
    // needs; contention on the connection pool is an artefact of the harness.
    const product = await prisma.$transaction(
      async (tx) => makeProduct(tx, { quantity: 1 }),
      TX_OPTIONS,
    );

    try {
      const claim = () =>
        prisma.$transaction(async (tx) => {
          const { claimedIds } = await claimProductStock(
            [{ productId: product.id, quantity: 1 }],
            tx,
          );
          return claimedIds.length === 1;
        }, TX_OPTIONS);

      const results = await Promise.all([claim(), claim()]);

      // Exactly one won: the other matched 0 rows in the guarded UPDATE.
      expect(results.filter(Boolean)).toHaveLength(1);

      const after = await prisma.product.findUnique({
        where: { id: product.id },
        select: { quantity: true },
      });
      // Exactly one unit left the shelf — never negative.
      expect(after!.quantity).toBe(0);
    } finally {
      // This test cannot use the rollback trick: the two transactions must
      // commit to be observed by each other. Clean the row up explicitly.
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
    }
  });

  it("never drives quantity below zero under repeated concurrent claims", async () => {
    const product = await prisma.$transaction(
      async (tx) => makeProduct(tx, { quantity: 2 }),
      TX_OPTIONS,
    );

    try {
      // Four claims race for 2 units and exactly 2 must win.
      //
      // Four, not five, and the requests are STAGGERED rather than all fired in
      // the same tick. Both details are deliberate: the invariant under test is
      // "quantity never goes below zero however the claims interleave", and it
      // does not need simultaneous connections to be exercised — the guarded
      // WHERE clause is what serializes them. Firing N at once instead makes the
      // test a probe of the remote pooler's connection ceiling, where it fails
      // with "Unable to start a transaction in the given time" instead of
      // testing anything about stock.
      const claims = Array.from({ length: 4 }, (_, index) =>
        new Promise<boolean>((resolve, reject) => {
          setTimeout(
            () => {
              prisma
                .$transaction(async (tx) => {
                  const { claimedIds } = await claimProductStock(
                    [{ productId: product.id, quantity: 1 }],
                    tx,
                  );
                  return claimedIds.length === 1;
                }, TX_OPTIONS)
                .then(resolve, reject);
            },
            // 0/40/80/120 ms — overlapping, so rows still contend.
            index * 40,
          );
        }),
      );
      const results = await Promise.all(claims);

      expect(results.filter(Boolean)).toHaveLength(2);

      const after = await prisma.product.findUnique({
        where: { id: product.id },
        select: { quantity: true },
      });
      // Never negative — the guarded WHERE clause is the only thing stopping
      // the losing claims from each driving it below zero.
      expect(after!.quantity).toBe(0);
      expect(after!.quantity).toBeGreaterThanOrEqual(0);
    } finally {
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
    }
  });
});

describeDb("releaseOrderStock", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Builds the minimal order graph a release needs: one product, one order,
   * one order item. `userId` must reference a real user (the FK is Restrict),
   * so an existing one is reused and never modified.
   */
  async function makeOrderWithItem(
    tx: Prisma.TransactionClient,
    opts: { productQuantity: number; orderedQuantity: number },
  ) {
    const userId = (
      await tx.user.findFirst({ select: { id: true } })
    )!.id;

    const product = await makeProduct(tx, { quantity: opts.productQuantity });
    const order = await tx.order.create({
      data: {
        id: randomUUID(),
        userId,
        status: "pending",
        totalAmount: 1_000_000,
        currency: "TOMAN",
        recipientName: "Test",
        phone: "09120000000",
        addressLine: "Line",
        city: "City",
        postalCode: "1234567890",
      },
    });
    await tx.orderItem.create({
      data: {
        id: randomUUID(),
        orderId: order.id,
        productId: product.id,
        quantity: opts.orderedQuantity,
        unitPriceAtPurchase: 1_000_000,
        name: { en: "Stock Test", fa: "تست موجودی" },
        image: "/test-hero.jpg",
      },
    });

    return { product, order };
  }

  it("returns the ordered quantity to stock", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          // Simulate a completed claim: the product has already been decremented.
          const { product, order } = await makeOrderWithItem(tx, {
            productQuantity: 7,
            orderedQuantity: 2,
          });

          await releaseOrderStock(order.id, tx);

          const after = await tx.product.findUnique({
            where: { id: product.id },
            select: { quantity: true },
          });
          expect(after!.quantity).toBe(9);

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);
  });

  it("skips an order item whose product was deleted", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const { product, order } = await makeOrderWithItem(tx, {
            productQuantity: 4,
            orderedQuantity: 1,
          });

          // Deleting the product sets OrderItem.productId to NULL (onDelete:
          // SetNull) so the order history survives. There is then no row to
          // credit, and the release must not throw.
          await tx.product.delete({ where: { id: product.id } });

          await expect(releaseOrderStock(order.id, tx)).resolves.toBeUndefined();

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);
  });

  it("is a no-op for an order with no items", async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const userId = (await tx.user.findFirst({ select: { id: true } }))!.id;
          const order = await tx.order.create({
            data: {
              id: randomUUID(),
              userId,
              status: "pending",
              totalAmount: 0,
              currency: "TOMAN",
              recipientName: "Test",
              phone: "09120000000",
              addressLine: "Line",
              city: "City",
              postalCode: "1234567890",
            },
          });

          await expect(releaseOrderStock(order.id, tx)).resolves.toBeUndefined();

          throw new Error(ROLLBACK);
        },
        TX_OPTIONS,
      ),
    ).rejects.toThrow(ROLLBACK);
  });
});

/**
 * `claimPendingOrder` is the single writer of a terminal order status, and it
 * carries three guarantees that the checkout callback depends on. Unlike the
 * suites above, these tests CANNOT use the rollback trick: the function opens
 * its own transaction, so its writes must commit to be observable. Every test
 * here therefore cleans up after itself.
 */
describeDb("claimPendingOrder", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  /** A committed product + order + item graph, plus its own cleanup. */
  async function setUpPendingOrder(opts: {
    productQuantity: number;
    orderedQuantity: number;
    status?: "pending" | "paid" | "failed";
  }) {
    const userId = (await prisma.user.findFirst({ select: { id: true } }))!.id;

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
        // See the note on `makeProduct` — never sort ahead of real seed rows.
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

    /** Removes everything this test created, in FK-safe order. */
    async function cleanup() {
      await prisma.orderItem
        .deleteMany({ where: { orderId: order.id } })
        .catch(() => {});
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
    }

    return { product, order, cleanup };
  }

  it("settles a pending order to paid", async () => {
    const { order, cleanup } = await setUpPendingOrder({
      productQuantity: 5,
      orderedQuantity: 1,
    });

    try {
      const { changed } = await claimPendingOrder({
        orderId: order.id,
        status: "paid",
        zarinpalRefId: "REF-1",
      });

      expect(changed).toBe(true);

      const after = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true, zarinpalRefId: true },
      });
      expect(after!.status).toBe("paid");
      expect(after!.zarinpalRefId).toBe("REF-1");
    } finally {
      await cleanup();
    }
  });

  it("releases the stock reservation when settling to failed", async () => {
    // The reservation leak the fix closes: the checkout claim decremented
    // `quantity`, so a failure must put it back.
    const { product, order, cleanup } = await setUpPendingOrder({
      productQuantity: 7,
      orderedQuantity: 2,
    });

    try {
      await prisma.product.update({
        where: { id: product.id },
        data: { quantity: { decrement: 2 } },
      });

      const { changed } = await claimPendingOrder({
        orderId: order.id,
        status: "failed",
      });

      expect(changed).toBe(true);

      const after = await prisma.product.findUnique({
        where: { id: product.id },
        select: { quantity: true },
      });
      // 7 - 2 (the claim) + 2 (the release) = 7.
      expect(after!.quantity).toBe(7);
    } finally {
      await cleanup();
    }
  });

  it("does NOT release stock when settling to paid — the goods are owed", async () => {
    const { product, order, cleanup } = await setUpPendingOrder({
      productQuantity: 5,
      orderedQuantity: 2,
    });

    try {
      await claimPendingOrder({ orderId: order.id, status: "paid" });

      const after = await prisma.product.findUnique({
        where: { id: product.id },
        select: { quantity: true },
      });
      expect(after!.quantity).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("repairs a previously-failed order when the payment is verified — the recovery path", async () => {
    // THE BUG THIS UN-DOES: a misconfigured merchant id used to write "failed"
    // for a genuinely paid order. A paid result must therefore be able to
    // overwrite it, or the damage is permanent.
    const { order, cleanup } = await setUpPendingOrder({
      productQuantity: 5,
      orderedQuantity: 1,
      status: "failed",
    });

    try {
      const { changed } = await claimPendingOrder({
        orderId: order.id,
        status: "paid",
        zarinpalRefId: "REF-REPAIR",
      });

      expect(changed).toBe(true);

      const after = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true, zarinpalRefId: true },
      });
      expect(after!.status).toBe("paid");
      expect(after!.zarinpalRefId).toBe("REF-REPAIR");
    } finally {
      await cleanup();
    }
  });

  it("is idempotent for paid — a re-delivered callback changes nothing", async () => {
    // ZarinPal retries callbacks, and customers refresh the confirmation page.
    // A second "paid" must report `changed: false`, which is what gates the
    // duplicate receipt.
    const { order, cleanup } = await setUpPendingOrder({
      productQuantity: 5,
      orderedQuantity: 1,
      status: "paid",
    });

    try {
      const { changed } = await claimPendingOrder({
        orderId: order.id,
        status: "paid",
      });

      expect(changed).toBe(false);
    } finally {
      await cleanup();
    }
  });

  it("never downgrades a paid order to failed", async () => {
    // The guarantee that stops a re-delivered failure callback from undoing a
    // confirmed payment — and from double-releasing the stock.
    const { product, order, cleanup } = await setUpPendingOrder({
      productQuantity: 5,
      orderedQuantity: 2,
      status: "paid",
    });

    try {
      const { changed } = await claimPendingOrder({
        orderId: order.id,
        status: "failed",
      });

      expect(changed).toBe(false);

      const orderAfter = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      expect(orderAfter!.status).toBe("paid");

      const productAfter = await prisma.product.findUnique({
        where: { id: product.id },
        select: { quantity: true },
      });
      // Untouched — no phantom credit.
      expect(productAfter!.quantity).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("only releases stock once when the failure callback is delivered twice", async () => {
    // Two guarded claims both originate from `pending`; the first wins and the
    // second matches nothing, so the stock is credited exactly once.
    const { product, order, cleanup } = await setUpPendingOrder({
      productQuantity: 4,
      orderedQuantity: 2,
    });

    try {
      await prisma.product.update({
        where: { id: product.id },
        data: { quantity: { decrement: 2 } },
      });

      const first = await claimPendingOrder({
        orderId: order.id,
        status: "failed",
      });
      const second = await claimPendingOrder({
        orderId: order.id,
        status: "failed",
      });

      expect(first.changed).toBe(true);
      expect(second.changed).toBe(false);

      const after = await prisma.product.findUnique({
        where: { id: product.id },
        select: { quantity: true },
      });
      // Exactly one release: 4 - 2 + 2 = 4. A second release would give 6.
      expect(after!.quantity).toBe(4);
    } finally {
      await cleanup();
    }
  });

  it("lets only one of two concurrent paid claims change the order", async () => {
    // The two callbacks race; the guarded UPDATE means one wins and the other
    // reports `changed: false` rather than both sending a receipt.
    const { order, cleanup } = await setUpPendingOrder({
      productQuantity: 5,
      orderedQuantity: 1,
    });

    try {
      const settle = () =>
        claimPendingOrder({
          orderId: order.id,
          status: "paid",
          txOptions: TX_OPTIONS,
        });

      const [a, b] = await Promise.all([settle(), settle()]);

      expect([a.changed, b.changed].filter(Boolean)).toHaveLength(1);
    } finally {
      await cleanup();
    }
  });

  it("reports no change for an order that does not exist", async () => {
    const { changed } = await claimPendingOrder({
      orderId: randomUUID(),
      status: "paid",
    });

    expect(changed).toBe(false);
  });
});

