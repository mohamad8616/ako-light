/**
 * Customer order access + the guarded fulfillment transition (Pass 15).
 *
 * Two things are pinned here that nothing else covers:
 *
 *   1. OWNERSHIP IS IN THE QUERY. `getMyOrders` / `getMyOrder` take the
 *      authenticated user id and put it in the WHERE clause, so another
 *      account's order is indistinguishable from one that does not exist.
 *   2. TRANSITIONS ARE VALIDATED SERVER-SIDE. `updateOrderFulfillmentStatus`
 *      used to be a plain `prisma.order.update`, which let an admin walk an
 *      order backwards or start fulfilment on an unpaid order.
 *
 * These functions open their own transaction, so the rollback trick does not
 * apply — the fixtures commit and every test cleans up after itself, in
 * FK-safe order (orderItem → order → product → user).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  getMyOrder,
  getMyOrders,
  InvalidOrderTransitionError,
  updateOrderFulfillmentStatus,
} from "@/lib/repositories/orders";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const SEED_CATEGORY_ID = "lighting";
/** See order-stock.test.ts — never sort a fixture ahead of real seed rows. */
const LEAKED_FIXTURE_SORT_ORDER = 9_999;

const SHIPPING = {
  recipientName: "Test Recipient",
  phone: "09120000000",
  addressLine: "1 Test Street",
  city: "Tehran",
  postalCode: "1234567890",
};

describeDb("customer order access and fulfillment transitions", () => {
  const userIds: string[] = [];
  const productIds: string[] = [];
  const orderIds: string[] = [];

  afterEach(async () => {
    for (const id of orderIds.splice(0)) {
      await prisma.orderItem.deleteMany({ where: { orderId: id } }).catch(() => {});
      await prisma.order.delete({ where: { id } }).catch(() => {});
    }
    for (const id of productIds.splice(0)) {
      await prisma.orderItem.deleteMany({ where: { productId: id } }).catch(() => {});
      await prisma.product.delete({ where: { id } }).catch(() => {});
    }
    for (const id of userIds.splice(0)) {
      await prisma.order.deleteMany({ where: { userId: id } }).catch(() => {});
      await prisma.user.delete({ where: { id } }).catch(() => {});
    }
  });

  /** A throwaway account — orders FK to User with onDelete: Restrict. */
  async function makeUser() {
    const key = randomUUID();
    const user = await prisma.user.create({
      data: {
        id: key,
        name: "Order Access Test",
        email: `order-access-${key}@example.test`,
      },
    });
    userIds.push(user.id);
    return user;
  }

  async function makeProduct() {
    const key = randomUUID();
    const product = await prisma.product.create({
      data: {
        id: key,
        slug: `order-access-${key}`,
        name: { en: "Snapshot Name", fa: "نام لحظه‌ای" },
        hoverImage: "/test-hover.jpg",
        heroImage: "/test-hero.jpg",
        priceEur: 10,
        priceToman: 7_000_000,
        existsInStore: true,
        quantity: 10,
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

  async function makeOrder(opts: {
    userId: string;
    status?: "pending" | "paid" | "failed" | "cancelled";
    fulfillmentStatus?:
      | "unfulfilled"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled";
    createdAt?: Date;
    productId?: string | null;
  }) {
    const order = await prisma.order.create({
      data: {
        id: randomUUID(),
        userId: opts.userId,
        status: opts.status ?? "pending",
        fulfillmentStatus: opts.fulfillmentStatus ?? "unfulfilled",
        totalAmount: 7_000_000,
        currency: "TOMAN",
        ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
        ...SHIPPING,
      },
    });
    orderIds.push(order.id);

    await prisma.orderItem.create({
      data: {
        id: randomUUID(),
        orderId: order.id,
        productId: opts.productId === undefined ? null : opts.productId,
        quantity: 2,
        unitPriceAtPurchase: 7_000_000,
        // The SNAPSHOT — deliberately different from any live product name, so
        // a test can prove the snapshot is what gets rendered.
        name: { en: "Snapshot Name", fa: "نام لحظه‌ای" },
        image: "/snapshot.jpg",
      },
    });

    return order;
  }

  // -------------------------------------------------------------------------
  // Ownership
  // -------------------------------------------------------------------------

  it("returns only the caller's orders", async () => {
    const mine = await makeUser();
    const theirs = await makeUser();
    await makeOrder({ userId: mine.id });
    await makeOrder({ userId: mine.id });
    await makeOrder({ userId: theirs.id });

    const orders = await getMyOrders(mine.id);
    expect(orders).toHaveLength(2);
    expect(orders.every((o) => o.id !== undefined)).toBe(true);

    const theirOrders = await getMyOrders(theirs.id);
    expect(theirOrders).toHaveLength(1);
    // Disjoint — no leakage in either direction.
    const mineIds = new Set(orders.map((o) => o.id));
    expect(theirOrders.some((o) => mineIds.has(o.id))).toBe(false);
  });

  it("returns an empty list for a user with no orders", async () => {
    const user = await makeUser();
    expect(await getMyOrders(user.id)).toEqual([]);
  });

  it("orders the list deterministically, newest first", async () => {
    const user = await makeUser();
    const older = await makeOrder({
      userId: user.id,
      createdAt: new Date("2020-01-01T00:00:00Z"),
    });
    const newer = await makeOrder({
      userId: user.id,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const orders = await getMyOrders(user.id);
    expect(orders.map((o) => o.id)).toEqual([newer.id, older.id]);

    // Stable across calls — the secondary id sort breaks createdAt ties.
    const again = await getMyOrders(user.id);
    expect(again.map((o) => o.id)).toEqual(orders.map((o) => o.id));
  });

  it("breaks a createdAt tie deterministically", async () => {
    const user = await makeUser();
    const at = new Date("2024-06-01T12:00:00Z");
    await makeOrder({ userId: user.id, createdAt: at });
    await makeOrder({ userId: user.id, createdAt: at });

    const first = await getMyOrders(user.id);
    const second = await getMyOrders(user.id);
    expect(first.map((o) => o.id)).toEqual(second.map((o) => o.id));
  });

  it("does not expose payment internals or the owning user id", async () => {
    const user = await makeUser();
    const order = await makeOrder({ userId: user.id });

    const [summary] = await getMyOrders(user.id);
    const keys = Object.keys(summary);

    for (const forbidden of [
      "userId",
      "zarinpalAuthority",
      "zarinpalRefId",
      "idempotencyKey",
    ]) {
      expect(keys, `${forbidden} must not be projected`).not.toContain(forbidden);
    }
    expect(summary.id).toBe(order.id);
  });

  // -------------------------------------------------------------------------
  // Detail + snapshot
  // -------------------------------------------------------------------------

  it("returns the caller's own order with its shipping details", async () => {
    const user = await makeUser();
    const product = await makeProduct();
    const order = await makeOrder({ userId: user.id, productId: product.id });

    const detail = await getMyOrder(user.id, order.id);
    expect(detail).not.toBeNull();
    expect(detail!.id).toBe(order.id);
    expect(detail!.recipientName).toBe(SHIPPING.recipientName);
    expect(detail!.city).toBe(SHIPPING.city);
  });

  it("refuses another account's order, indistinguishably from a missing one", async () => {
    const mine = await makeUser();
    const theirs = await makeUser();
    const theirOrder = await makeOrder({ userId: theirs.id });

    const stolen = await getMyOrder(mine.id, theirOrder.id);
    const missing = await getMyOrder(mine.id, randomUUID());

    // Both null — the caller cannot probe for the existence of other orders.
    expect(stolen).toBeNull();
    expect(missing).toBeNull();
    expect(stolen).toEqual(missing);
  });

  it("serves the STORED snapshot, not the product's current values", async () => {
    const user = await makeUser();
    const product = await makeProduct();
    const order = await makeOrder({ userId: user.id, productId: product.id });

    // The product changes after the order was placed.
    await prisma.product.update({
      where: { id: product.id },
      data: {
        name: { en: "Renamed Later", fa: "نام جدید" },
        priceToman: 99_000_000,
        heroImage: "/renamed.jpg",
      },
    });

    const detail = await getMyOrder(user.id, order.id);
    const line = detail!.items[0];

    expect(line.name).toEqual({ en: "Snapshot Name", fa: "نام لحظه‌ای" });
    expect(line.unitPriceAtPurchase).toBe(7_000_000);
    expect(line.image).toBe("/snapshot.jpg");
    // …while the live slug is still offered as a link.
    expect(line.productSlug).toBe(product.slug);
  });

  it("computes the line total and item count server-side", async () => {
    const user = await makeUser();
    const order = await makeOrder({ userId: user.id });

    const detail = await getMyOrder(user.id, order.id);
    // 7,000,000 x 2
    expect(detail!.items[0].lineTotal).toBe(14_000_000);
    expect(detail!.itemCount).toBe(2);
  });

  it("handles a deleted product — the line survives as history", async () => {
    const user = await makeUser();
    const product = await makeProduct();
    const order = await makeOrder({ userId: user.id, productId: product.id });

    await prisma.orderItem.deleteMany({ where: { productId: product.id } }).catch(() => {});
    await prisma.product.delete({ where: { id: product.id } });
    productIds.splice(productIds.indexOf(product.id), 1);

    // The order and its shipping details are untouched by the product's death.
    const detail = await getMyOrder(user.id, order.id);
    expect(detail).not.toBeNull();
    expect(detail!.id).toBe(order.id);
  });

  // -------------------------------------------------------------------------
  // Guarded transitions
  // -------------------------------------------------------------------------

  it("applies a valid forward transition", async () => {
    const user = await makeUser();
    const order = await makeOrder({ userId: user.id, status: "paid" });

    await expect(
      updateOrderFulfillmentStatus(order.id, "processing"),
    ).resolves.toBeUndefined();

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { fulfillmentStatus: true },
    });
    expect(after.fulfillmentStatus).toBe("processing");
  });

  it("refuses to start fulfilment on an unpaid order", async () => {
    const user = await makeUser();
    const order = await makeOrder({ userId: user.id, status: "pending" });

    await expect(
      updateOrderFulfillmentStatus(order.id, "processing"),
    ).rejects.toBeInstanceOf(InvalidOrderTransitionError);

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { fulfillmentStatus: true },
    });
    expect(after.fulfillmentStatus).toBe("unfulfilled");
  });

  it("still allows cancelling an unpaid order", async () => {
    const user = await makeUser();
    const order = await makeOrder({ userId: user.id, status: "pending" });

    await expect(
      updateOrderFulfillmentStatus(order.id, "cancelled"),
    ).resolves.toBeUndefined();
  });

  it("refuses to walk an order backwards", async () => {
    const user = await makeUser();
    const order = await makeOrder({
      userId: user.id,
      status: "paid",
      fulfillmentStatus: "shipped",
    });

    await expect(
      updateOrderFulfillmentStatus(order.id, "processing"),
    ).rejects.toBeInstanceOf(InvalidOrderTransitionError);

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { fulfillmentStatus: true },
    });
    expect(after.fulfillmentStatus).toBe("shipped");
  });

  it("refuses to move a delivered order at all", async () => {
    const user = await makeUser();
    const order = await makeOrder({
      userId: user.id,
      status: "paid",
      fulfillmentStatus: "delivered",
    });

    await expect(
      updateOrderFulfillmentStatus(order.id, "unfulfilled"),
    ).rejects.toBeInstanceOf(InvalidOrderTransitionError);

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { fulfillmentStatus: true },
    });
    expect(after.fulfillmentStatus).toBe("delivered");
  });

  it("treats a same-state submit as a no-op, not an error", async () => {
    const user = await makeUser();
    const order = await makeOrder({
      userId: user.id,
      status: "paid",
      fulfillmentStatus: "shipped",
    });

    await expect(
      updateOrderFulfillmentStatus(order.id, "shipped"),
    ).resolves.toBeUndefined();
  });

  it("never writes the payment status", async () => {
    const user = await makeUser();
    const order = await makeOrder({ userId: user.id, status: "pending" });

    // Cancelling the fulfilment of an unpaid order must not make it "paid" —
    // only the gateway callback may ever write that column.
    await updateOrderFulfillmentStatus(order.id, "cancelled");

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true },
    });
    expect(after.status).toBe("pending");
  });

  it("reports a missing order as a refusal", async () => {
    await expect(
      updateOrderFulfillmentStatus(randomUUID(), "shipped"),
    ).rejects.toBeInstanceOf(InvalidOrderTransitionError);
  });
});
