/**
 * `createPendingOrder` — the checkout action itself.
 *
 * Before this file the whole action was untested: stock claiming was covered
 * (`order-stock.test.ts`), but nothing pinned the things the action is
 * responsible for — that it re-reads the database instead of trusting the
 * browser, that it charges the CURRENT price, that it snapshots the order line,
 * that a bad line leaves no order behind, and that a double-submit cannot
 * create two orders.
 *
 * Unlike the stock suites these CANNOT use the rollback trick: the action opens
 * its own transaction, so its writes must commit to be observable. Every test
 * cleans up after itself, in FK-safe order.
 *
 * The gateway is mocked. This file is about "checkout produced the correct
 * order, total and payment-initialisation input" — not about ZarinPal, which is
 * Pass 14.5's subject.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const mockGetSession = vi.fn();
const mockRequest = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

// A Server Action receives its request through `next/headers`; outside a real
// request scope that call throws, so the request is stubbed. Nothing below it
// is mocked — the action's own logic, Prisma and the transaction are all real.
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/payments/zarinpal", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/payments/zarinpal")>();
  // `toRial` / `buildZarinPalBaseUrl` stay real — the action uses the latter to
  // rebuild a redirect URL for a replayed checkout.
  return { ...actual, request: mockRequest };
});

const { createPendingOrder } = await import("@/lib/actions/checkout");

const describeDb = describe.skipIf(!hasDatabaseUrl);

const SEED_CATEGORY_ID = "lighting";
/** See order-stock.test.ts — never sort a fixture ahead of real seed rows. */
const LEAKED_FIXTURE_SORT_ORDER = 9_999;

const AUTHORITY = "A00000000000000000000000000000000001";

const SHIPPING = {
  recipientName: "Test Recipient",
  phone: "09120000000",
  addressLine: "1 Test Street",
  city: "Tehran",
  postalCode: "1234567890",
};

describeDb("createPendingOrder", () => {
  /** Everything a single test created, removed in FK-safe order. */
  const productIds: string[] = [];
  const orderIds: string[] = [];

  let userId: string;

  beforeEach(async () => {
    mockGetSession.mockReset();
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({
      code: 100,
      message: "ok",
      authority: AUTHORITY,
      redirectUrl: `https://sandbox.zarinpal.com/pg/StartPay/${AUTHORITY}`,
    });

    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) throw new Error("the dev database has no seeded user to order as");
    userId = user.id;
    mockGetSession.mockResolvedValue({ user: { id: userId } });
  });

  afterEach(async () => {
    // Orders first: OrderItem cascades, and Product is FK-referenced by it.
    for (const id of orderIds.splice(0)) {
      await prisma.orderItem.deleteMany({ where: { orderId: id } }).catch(() => {});
      await prisma.order.delete({ where: { id } }).catch(() => {});
    }
    for (const id of productIds.splice(0)) {
      await prisma.orderItem.deleteMany({ where: { productId: id } }).catch(() => {});
      await prisma.product.delete({ where: { id } }).catch(() => {});
    }
  });

  /** A committed product the action can find. */
  async function makeProduct(overrides: {
    quantity?: number;
    existsInStore?: boolean;
    priceToman?: number;
    name?: { en: string; fa: string };
  } = {}) {
    const key = randomUUID();
    const product = await prisma.product.create({
      data: {
        id: key,
        slug: `checkout-test-${key}`,
        name: overrides.name ?? { en: "Checkout Test", fa: "تست پرداخت" },
        hoverImage: "/test-hover.jpg",
        heroImage: "/test-hero.jpg",
        priceEur: 10,
        priceToman: overrides.priceToman ?? 10_000_000,
        existsInStore: overrides.existsInStore ?? true,
        quantity: overrides.quantity ?? 5,
        description: { en: "d", fa: "د" },
        downloads: [],
        related: [],
        sortOrder: LEAKED_FIXTURE_SORT_ORDER,
        categoryId: SEED_CATEGORY_ID,
      },
    });
    productIds.push(product.id);
    return product;
  }

  function trackOrder(orderId: string) {
    orderIds.push(orderId);
    return orderId;
  }

  function itemsFor(productId: string, quantity = 1) {
    return [{ productId, quantity }];
  }

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("creates a pending order with the server-computed total and a snapshot line", async () => {
    const product = await makeProduct({ priceToman: 10_000_000, quantity: 5 });

    const result = await createPendingOrder({
      items: itemsFor(product.id, 2),
      ...SHIPPING,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    trackOrder(result.orderId);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: result.orderId },
      include: { items: true },
    });

    expect(order.status).toBe("pending");
    expect(order.currency).toBe("TOMAN");
    expect(order.totalAmount.toNumber()).toBe(20_000_000);
    expect(order.userId).toBe(userId);
    expect(order.zarinpalAuthority).toBe(AUTHORITY);

    expect(order.items).toHaveLength(1);
    const line = order.items[0];
    // The snapshot is what makes the order survive a later product edit.
    expect(line.unitPriceAtPurchase.toNumber()).toBe(10_000_000);
    expect(line.quantity).toBe(2);
    expect(line.image).toBe("/test-hero.jpg");
    expect(line.name).toEqual({ en: "Checkout Test", fa: "تست پرداخت" });
  });

  it("decrements stock by exactly the ordered quantity", async () => {
    const product = await makeProduct({ quantity: 5 });

    const result = await createPendingOrder({
      items: itemsFor(product.id, 3),
      ...SHIPPING,
    });
    expect(result.ok).toBe(true);
    if (result.ok) trackOrder(result.orderId);

    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { quantity: true },
    });
    expect(after.quantity).toBe(2);
  });

  it("sums a duplicated product into one line", async () => {
    const product = await makeProduct({ priceToman: 1_000_000, quantity: 10 });

    const result = await createPendingOrder({
      items: [
        { productId: product.id, quantity: 2 },
        { productId: product.id, quantity: 3 },
      ],
      ...SHIPPING,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    trackOrder(result.orderId);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: result.orderId },
      include: { items: true },
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(5);
    expect(order.totalAmount.toNumber()).toBe(5_000_000);
  });

  it("passes the authoritative order total to the gateway, in Toman", async () => {
    const product = await makeProduct({ priceToman: 12_345_678, quantity: 2 });

    const result = await createPendingOrder({
      items: itemsFor(product.id, 2),
      ...SHIPPING,
    });
    expect(result.ok).toBe(true);
    if (result.ok) trackOrder(result.orderId);

    expect(mockRequest).toHaveBeenCalledTimes(1);
    // The gateway receives the DB total — never a client-supplied figure.
    expect(mockRequest.mock.calls[0][0].amountToman).toBe(24_691_356);
    // …and a callback that names the order it belongs to.
    expect(mockRequest.mock.calls[0][0].callbackUrl).toContain(
      encodeURIComponent(result.ok ? result.orderId : ""),
    );
  });

  // -------------------------------------------------------------------------
  // Price authority (§11) — the browser cannot set the price
  // -------------------------------------------------------------------------

  it("charges the CURRENT database price, ignoring any stale client figure", async () => {
    const product = await makeProduct({ priceToman: 10_000_000, quantity: 5 });

    // The admin raises the price between "add to cart" and "checkout".
    await prisma.product.update({
      where: { id: product.id },
      data: { priceToman: 12_000_000 },
    });

    const result = await createPendingOrder({
      // A client that tries to smuggle the old price in changes nothing: the
      // action reads only ids and quantities.
      items: itemsFor(product.id, 1),
      ...SHIPPING,
    } as never);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    trackOrder(result.orderId);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: result.orderId },
      include: { items: true },
    });
    expect(order.totalAmount.toNumber()).toBe(12_000_000);
    expect(order.items[0].unitPriceAtPurchase.toNumber()).toBe(12_000_000);
    expect(mockRequest.mock.calls[0][0].amountToman).toBe(12_000_000);
  });

  it("ignores client-supplied price and total fields entirely", async () => {
    const product = await makeProduct({ priceToman: 10_000_000, quantity: 5 });

    const result = await createPendingOrder({
      items: [{ productId: product.id, quantity: 1, unitPrice: 1, total: 1 }],
      ...SHIPPING,
      totalAmount: 1,
      subtotal: 1,
      price: 1,
    } as never);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    trackOrder(result.orderId);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: result.orderId },
    });
    expect(order.totalAmount.toNumber()).toBe(10_000_000);
  });

  // -------------------------------------------------------------------------
  // Product validation (§3)
  // -------------------------------------------------------------------------

  it("refuses a product that does not exist and creates no order", async () => {
    const before = await prisma.order.count();

    const result = await createPendingOrder({
      items: itemsFor(randomUUID(), 1),
      ...SHIPPING,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no longer available/i);
    expect(await prisma.order.count()).toBe(before);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("refuses a product that is not in the store", async () => {
    const product = await makeProduct({ existsInStore: false });

    const result = await createPendingOrder({
      items: itemsFor(product.id, 1),
      ...SHIPPING,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no longer available/i);
    // The row is untouched — an unavailable product is not decremented.
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { quantity: true },
    });
    expect(after.quantity).toBe(5);
  });

  it("refuses a product priced at zero", async () => {
    const product = await makeProduct({ priceToman: 0 });

    const result = await createPendingOrder({
      items: itemsFor(product.id, 1),
      ...SHIPPING,
    });

    expect(result.ok).toBe(false);
  });

  it("refuses a quantity larger than the stock and leaves stock untouched", async () => {
    const product = await makeProduct({ quantity: 2 });

    const result = await createPendingOrder({
      items: itemsFor(product.id, 5),
      ...SHIPPING,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no longer available/i);
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { quantity: true },
    });
    expect(after.quantity).toBe(2);
  });

  // -------------------------------------------------------------------------
  // All-or-nothing (§9) — one bad line leaves no partial order
  // -------------------------------------------------------------------------

  it("creates no order at all when one of several lines is unavailable, and restores the other", async () => {
    const good = await makeProduct({ quantity: 5 });
    const scarce = await makeProduct({ quantity: 1 });

    const before = await prisma.order.count();

    const result = await createPendingOrder({
      items: [
        { productId: good.id, quantity: 2 },
        { productId: scarce.id, quantity: 3 },
      ],
      ...SHIPPING,
    });

    expect(result.ok).toBe(false);
    expect(await prisma.order.count()).toBe(before);

    // The rollback must have returned the good line's claim.
    const goodAfter = await prisma.product.findUniqueOrThrow({
      where: { id: good.id },
      select: { quantity: true },
    });
    expect(goodAfter.quantity).toBe(5);

    const scarceAfter = await prisma.product.findUniqueOrThrow({
      where: { id: scarce.id },
      select: { quantity: true },
    });
    expect(scarceAfter.quantity).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Input validation (§6, §17)
  // -------------------------------------------------------------------------

  it.each([
    ["zero", 0],
    ["negative", -3],
    ["above the ceiling", 1_001],
    ["non-integer", 1.5],
  ])("rejects a %s quantity with a quantity-specific message", async (_label, quantity) => {
    const product = await makeProduct();

    const result = await createPendingOrder({
      items: [{ productId: product.id, quantity }],
      ...SHIPPING,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The point of the dedicated check: NOT the generic "complete every field".
    expect(result.error).toMatch(/between 1 and 1000/i);
    expect(result.error).not.toMatch(/shipping field/i);
  });

  it("rejects an empty cart", async () => {
    const result = await createPendingOrder({ items: [], ...SHIPPING });
    expect(result.ok).toBe(false);
  });

  it("rejects a missing shipping field", async () => {
    const product = await makeProduct();

    const result = await createPendingOrder({
      items: itemsFor(product.id, 1),
      ...SHIPPING,
      city: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/shipping field/i);
  });

  it("refuses to create an order without a session", async () => {
    mockGetSession.mockResolvedValue(null);
    const product = await makeProduct();

    const result = await createPendingOrder({
      items: itemsFor(product.id, 1),
      ...SHIPPING,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/session/i);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Duplicate checkout (§14)
  // -------------------------------------------------------------------------

  it("creates ONE order when the same idempotency key is submitted twice", async () => {
    const product = await makeProduct({ quantity: 5, priceToman: 10_000_000 });
    const idempotencyKey = randomUUID();
    const payload = {
      items: itemsFor(product.id, 2),
      idempotencyKey,
      ...SHIPPING,
    };

    const first = await createPendingOrder(payload);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    trackOrder(first.orderId);

    // The double-click: byte-identical payload, same key.
    const second = await createPendingOrder(payload);

    expect(second.ok).toBe(true);
    if (!second.ok) return;

    // Same order, not a second one…
    expect(second.orderId).toBe(first.orderId);
    expect(
      await prisma.order.count({ where: { idempotencyKey } }),
    ).toBe(1);

    // …and the stock was claimed exactly ONCE.
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { quantity: true },
    });
    expect(after.quantity).toBe(3);

    // The replay does not re-ask the gateway.
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("still allows a genuine second order when the key differs", async () => {
    const product = await makeProduct({ quantity: 5 });

    const first = await createPendingOrder({
      items: itemsFor(product.id, 1),
      idempotencyKey: randomUUID(),
      ...SHIPPING,
    });
    expect(first.ok).toBe(true);
    if (first.ok) trackOrder(first.orderId);

    const second = await createPendingOrder({
      items: itemsFor(product.id, 1),
      idempotencyKey: randomUUID(),
      ...SHIPPING,
    });
    expect(second.ok).toBe(true);
    if (second.ok) trackOrder(second.orderId);

    expect(first.ok && second.ok && first.orderId).not.toBe(
      second.ok ? second.orderId : null,
    );
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { quantity: true },
    });
    expect(after.quantity).toBe(3);
  });

  it("refuses a key that already belongs to another account", async () => {
    const other = await prisma.user.findFirst({
      where: { id: { not: userId } },
      select: { id: true },
    });
    if (!other) return; // single-user dev database — nothing to assert

    const product = await makeProduct({ quantity: 5 });
    const idempotencyKey = randomUUID();

    const foreign = await prisma.order.create({
      data: {
        id: randomUUID(),
        userId: other.id,
        status: "pending",
        totalAmount: 1,
        currency: "TOMAN",
        idempotencyKey,
        ...SHIPPING,
      },
    });
    trackOrder(foreign.id);

    const result = await createPendingOrder({
      items: itemsFor(product.id, 1),
      idempotencyKey,
      ...SHIPPING,
    });

    // Never hands one account another account's order.
    expect(result.ok).toBe(false);
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { quantity: true },
    });
    expect(after.quantity).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Payment-initialisation failure (§10, §17)
  // -------------------------------------------------------------------------

  it("releases the reservation and fails the order when the gateway cannot be reached", async () => {
    mockRequest.mockRejectedValue(new Error("gateway unreachable"));
    const product = await makeProduct({ quantity: 5 });

    const result = await createPendingOrder({
      items: itemsFor(product.id, 1),
      ...SHIPPING,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // A meaningful message, with no gateway internals leaked.
    expect(result.error).toMatch(/payment gateway/i);
    expect(result.error).not.toMatch(/unreachable/i);

    // The reservation must not be held by an order that can never be paid.
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { quantity: true },
    });
    expect(after.quantity).toBe(5);

    const orphan = await prisma.order.findFirst({
      where: { userId, items: { some: { productId: product.id } } },
      orderBy: { createdAt: "desc" },
    });
    if (orphan) {
      trackOrder(orphan.id);
      expect(orphan.status).toBe("failed");
    }
  });

  // -------------------------------------------------------------------------
  // Pass 8 — the payment boundary (external call OUTSIDE the transaction)
  // -------------------------------------------------------------------------

  it("calls the gateway only AFTER the order is committed and visible", async () => {
    // Proves the boundary behaviourally: when the gateway is invoked, the order
    // must already be readable through a NEW connection, i.e. its transaction
    // has COMMITTED. If the request were made inside the transaction, the row
    // would still be uncommitted and invisible to an outside reader.
    const product = await makeProduct({ quantity: 3 });

    let orderVisibleWhenGatewayCalled = false;
    let orderStatusWhenGatewayCalled: string | null = null;

    mockRequest.mockImplementation(async (input: { description: string }) => {
      // `description` is `Order <orderId>` — extract the id and read it from a
      // fresh client, outside the checkout transaction.
      const orderId = input.description.replace(/^Order\s+/, "");
      const row = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      orderVisibleWhenGatewayCalled = row !== null;
      orderStatusWhenGatewayCalled = row?.status ?? null;
      return {
        code: 100,
        message: "ok",
        authority: AUTHORITY,
        redirectUrl: `https://sandbox.zarinpal.com/pg/StartPay/${AUTHORITY}`,
      };
    });

    const result = await createPendingOrder({
      items: itemsFor(product.id, 1),
      ...SHIPPING,
    });

    expect(result.ok).toBe(true);
    if (result.ok) trackOrder(result.orderId);

    // The commit happened before the gateway call.
    expect(orderVisibleWhenGatewayCalled).toBe(true);
    expect(orderStatusWhenGatewayCalled).toBe("pending");
  });

  it("does not hold the transaction open while the gateway is contacted", async () => {
    // A slow gateway must not extend the transaction. If the request were made
    // inside the transaction, this artificial delay would be inside it too; the
    // order would still be invisible when the gateway returns. Asserting the
    // order is visible and its stock already decremented proves the transaction
    // closed first.
    const product = await makeProduct({ quantity: 3 });

    mockRequest.mockImplementation(async () => {
      // Sleep to make "inside the transaction" impossible to hide.
      await new Promise((resolve) => setTimeout(resolve, 400));
      // By now the transaction must have committed: the stock decrement is
      // visible from an independent reader.
      const after = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
        select: { quantity: true },
      });
      expect(after.quantity).toBe(2);
      return {
        code: 100,
        message: "ok",
        authority: AUTHORITY,
        redirectUrl: `https://sandbox.zarinpal.com/pg/StartPay/${AUTHORITY}`,
      };
    });

    const result = await createPendingOrder({
      items: itemsFor(product.id, 1),
      ...SHIPPING,
    });

    expect(result.ok).toBe(true);
    if (result.ok) trackOrder(result.orderId);
  });

  it("never leaks internals in a failure message", async () => {
    mockRequest.mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.5:5432 secret=abc"),
    );
    const product = await makeProduct();

    const result = await createPendingOrder({
      items: itemsFor(product.id, 1),
      ...SHIPPING,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).not.toMatch(/ECONNREFUSED|5432|secret|prisma|stack/i);
  });

  // -------------------------------------------------------------------------
  // Pass 8 — concurrency on the checkout action itself
  // -------------------------------------------------------------------------

  it("lets only ONE of two concurrent checkouts take the last unit", async () => {
    // The whole point of claiming stock at order creation. Both requests are
    // real calls to the real action against the real database; only the
    // gateway is mocked. Exactly one must win, and stock must never go
    // negative.
    const product = await makeProduct({ quantity: 1 });

    const payloadFor = () => ({
      items: itemsFor(product.id, 1),
      // Distinct keys: this is the stock race, not an idempotency replay.
      idempotencyKey: randomUUID(),
      ...SHIPPING,
    });

    const [a, b] = await Promise.all([
      createPendingOrder(payloadFor()),
      createPendingOrder(payloadFor()),
    ]);

    for (const result of [a, b]) {
      if (result.ok) trackOrder(result.orderId);
    }

    // Exactly one succeeded.
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);

    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { quantity: true },
    });
    // One unit left the shelf, and never below zero.
    expect(after.quantity).toBe(0);
    expect(after.quantity).toBeGreaterThanOrEqual(0);

    // Exactly one order was created for this product.
    const orders = await prisma.order.count({
      where: { items: { some: { productId: product.id } } },
    });
    expect(orders).toBe(1);
  });

  it("keeps exactly one order under concurrent requests with the SAME key", async () => {
    const product = await makeProduct({ quantity: 5, priceToman: 10_000_000 });
    const idempotencyKey = randomUUID();
    const payload = {
      items: itemsFor(product.id, 2),
      idempotencyKey,
      ...SHIPPING,
    };

    const [a, b] = await Promise.all([
      createPendingOrder(payload),
      createPendingOrder(payload),
    ]);

    for (const result of [a, b]) {
      if (result.ok) trackOrder(result.orderId);
    }

    // At most one may fail the unique-index race; the winner's order is the one
    // both should resolve to.
    const okResults = [a, b].filter((r): r is { ok: true; orderId: string; redirectUrl: string } => r.ok);
    expect(okResults.length).toBeGreaterThanOrEqual(1);

    expect(
      await prisma.order.count({ where: { idempotencyKey } }),
      "a concurrent same-key checkout must never create two orders",
    ).toBe(1);

    // Stock claimed exactly once.
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { quantity: true },
    });
    expect(after.quantity).toBe(3);

    // Exactly one OrderItem.
    const order = await prisma.order.findUniqueOrThrow({
      where: { idempotencyKey },
      include: { items: true },
    });
    expect(order.items).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Pass 8 — the transaction budget is explicit
  // -------------------------------------------------------------------------

  it("completes a multi-line checkout well inside the transaction budget", async () => {
    // A behavioural smoke test that the transaction does not approach its
    // ceiling on a normal cart. No millisecond threshold is asserted (that
    // would be flaky against a remote DB); the assertion is that a 4-line
    // checkout SUCCEEDS at all — which it could not reliably do under the old
    // 5 s default if the round-trip count regressed.
    const products = await Promise.all(
      Array.from({ length: 4 }, () => makeProduct({ quantity: 3 })),
    );

    const result = await createPendingOrder({
      items: products.map((p) => ({ productId: p.id, quantity: 1 })),
      ...SHIPPING,
    });

    expect(result.ok).toBe(true);
    if (result.ok) trackOrder(result.orderId);

    const order = result.ok
      ? await prisma.order.findUniqueOrThrow({
          where: { id: result.orderId },
          include: { items: true },
        })
      : null;
    expect(order?.items).toHaveLength(4);
    expect(order?.totalAmount.toNumber()).toBe(4 * 10_000_000);
  });
});
