// ---------------------------------------------------------------------------
// Customer-facing reads (Pass 15)
//
// OWNERSHIP IS ENFORCED BY THE QUERY, not by the caller and never by anything
// the browser sends. Both functions take the authenticated `userId` resolved
// from the session on the server, and both put it in the `where` clause — so a
// request for someone else's order matches no row. There is no "fetch then
// check" step that a future refactor could drop.
//
// The projections are deliberately NARROW. `zarinpalAuthority`, `zarinpalRefId`
// and `idempotencyKey` are payment-internal and are not selected at all, so they
// cannot leak into a customer response even by accident. `getMyOrder` returns
// null for BOTH "no such order" and "not yours", so the caller cannot tell the
// difference and cannot probe for the existence of other people's orders.
// ---------------------------------------------------------------------------
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Localized } from "@/lib/i18n/localized";
import { cache } from "react";
import { asLocalized } from "../casting";

export interface CustomerOrderSummary {
  id: string;
  createdAt: string;
  /** Payment state — written only by the gateway callback. */
  status: string;
  /** Fulfilment state — the shop's progress. */
  fulfillmentStatus: string;
  /** Order total in Toman. */
  totalAmount: number;
  currency: string;
  itemCount: number;
  /** The first line's snapshot image, for a list thumbnail. */
  previewImage: string | null;
}

export interface CustomerOrderLine {
  id: string;
  /** Null once the product has been deleted — the line is still history. */
  productId: string | null;
  /** Current slug, for a "view product" link. Null if the product is gone. */
  productSlug: string | null;
  /** Snapshot taken at purchase — never the product's current name. */
  name: Localized;
  /** Snapshot taken at purchase. */
  image: string;
  quantity: number;
  /** Toman, snapshot. */
  unitPriceAtPurchase: number;
  /** `unitPriceAtPurchase * quantity`, computed here so the UI cannot drift. */
  lineTotal: number;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  items: CustomerOrderLine[];
}

const customerOrderSelect = {
  id: true,
  createdAt: true,
  status: true,
  fulfillmentStatus: true,
  totalAmount: true,
  currency: true,
  // Shipping details the customer entered — theirs to see. Payment internals
  // (zarinpalAuthority / zarinpalRefId) and idempotencyKey are NOT selected.
  recipientName: true,
  phone: true,
  addressLine: true,
  city: true,
  postalCode: true,
  items: {
    select: {
      id: true,
      productId: true,
      name: true,
      image: true,
      quantity: true,
      unitPriceAtPurchase: true,
      product: { select: { slug: true } },
    },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.OrderSelect;

type CustomerOrderRow = Prisma.OrderGetPayload<{
  select: typeof customerOrderSelect;
}>;

function toCustomerOrderSummary(row: CustomerOrderRow): CustomerOrderSummary {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    fulfillmentStatus: row.fulfillmentStatus,
    totalAmount: row.totalAmount.toNumber(),
    currency: row.currency,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    previewImage: row.items[0]?.image ?? null,
  };
}

function toCustomerOrderDetail(row: CustomerOrderRow): CustomerOrderDetail {
  const items: CustomerOrderLine[] = row.items.map((item) => {
    const unit = item.unitPriceAtPurchase.toNumber();
    return {
      id: item.id,
      productId: item.productId,
      productSlug: item.product?.slug ?? null,
      name: asLocalized(item.name),
      image: item.image,
      quantity: item.quantity,
      unitPriceAtPurchase: unit,
      // Integer Toman on both sides, so this stays exact.
      lineTotal: unit * item.quantity,
    };
  });

  return {
    ...toCustomerOrderSummary(row),
    recipientName: row.recipientName,
    phone: row.phone,
    addressLine: row.addressLine,
    city: row.city,
    postalCode: row.postalCode,
    items,
  };
}

/**
 * Every order belonging to `userId`, newest first.
 *
 * The secondary `id` sort makes the order TOTAL: `createdAt` is not unique, so
 * two orders placed in the same millisecond would otherwise come back in an
 * arbitrary (and potentially different) order between calls.
 */
export const getMyOrders = cache(
  async (userId: string): Promise<CustomerOrderSummary[]> => {
    const rows = await prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: customerOrderSelect,
    });

    return rows.map(toCustomerOrderSummary);
  },
);

/**
 * One order, but only if it belongs to `userId`.
 *
 * Returns `null` when the order does not exist AND when it belongs to someone
 * else — the caller must not be able to distinguish the two.
 */
export const getMyOrder = cache(
  async (userId: string, orderId: string): Promise<CustomerOrderDetail | null> => {
    const row = await prisma.order.findFirst({
      // `userId` is part of the lookup, not a post-hoc check.
      where: { id: orderId, userId },
      select: customerOrderSelect,
    });

    return row ? toCustomerOrderDetail(row) : null;
  },
);
