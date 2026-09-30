"use server";

import { prisma } from "@/lib/db/prisma";
import { request as requestZarinpalPayment } from "@/lib/payments/zarinpal";
import { claimProductStock } from "@/lib/repositories/orders";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "../auth/auth";
import { asJsonInput } from "../repositories/casting";

const cartItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(1_000),
});

const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  recipientName: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(3).max(40),
  addressLine: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(40),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CheckoutActionResult =
  | { ok: true; orderId: string; redirectUrl: string }
  | { ok: false; error: string; affectedItems?: string[] };

/**
 * Creates an order from the browser cart. The browser supplies only product
 * ids and quantities; prices, names, images, availability and the total all
 * come from the live database inside the transaction.
 *
 * STOCK IS CLAIMED HERE, NOT AT PAYMENT. Each line is decremented with a
 * guarded `updateMany` inside the same transaction that creates the order, so
 * the check and the decrement are atomic: two concurrent checkouts for the
 * last unit cannot both pass (the loser matches 0 rows and is reported as
 * unavailable). Claiming at order creation — rather than after ZarinPal
 * confirms — is what stops two customers paying for the same unit.
 *
 * The trade-off is that an order which is never paid holds its stock until
 * something releases it. `releaseOrderStock()` in lib/repositories/orders.ts is
 * the release path; wiring it to the failure and stale-pending cases is the
 * remaining work (see the note on that function). Anything that fails
 * validation before the commit rolls the whole transaction back, so
 * already-claimed lines are restored automatically.
 */
export async function createPendingOrder(
  input: CheckoutInput,
): Promise<CheckoutActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return {
      ok: false,
      error: "Your session has expired. Please sign in again.",
    };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please complete every shipping field and add at least one item.",
    };
  }

  const itemById = new Map<string, number>();
  for (const item of parsed.data.items) {
    itemById.set(
      item.productId,
      (itemById.get(item.productId) ?? 0) + item.quantity,
    );
  }

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: [...itemById.keys()] } },
        include: { productImages: { orderBy: { sortOrder: "asc" }, take: 1 } },
      });

      // Claim every line's stock as part of THIS transaction. The claim is
      // atomic per product (see claimProductStock): the availability rule is in
      // the UPDATE's WHERE clause, so two concurrent checkouts for the last
      // unit cannot both succeed. A read-then-write check would not hold — both
      // transactions would read the same pre-decrement quantity and both pass.
      const { claimedIds, unavailable } = await claimProductStock(
        [...itemById].map(([productId, quantity]) => ({ productId, quantity })),
        tx,
      );

      // One unavailable line fails the whole order. Throwing here rolls the
      // transaction back, so stock already claimed above is restored — the
      // order and its stock movement commit together or not at all.
      if (unavailable.length > 0) {
        throw new StockValidationError(unavailable);
      }

      // Only claimed products are ordered. Filtering rather than mapping the
      // full `products` list keeps the order lines and the stock movement in
      // lockstep: a product can never be charged for without its reservation.
      const claimed = products.filter((product) =>
        claimedIds.includes(product.id),
      );

      const orderItems = claimed.map((product) => {
        const quantity = itemById.get(product.id)!;
        return {
          id: crypto.randomUUID(),
          productId: product.id,
          quantity,
          // Immutable transaction snapshot: the unit is Toman (priceToman),
          // never EUR. This is what the customer is actually charged, x10 to
          // Rial only at the ZarinPal API boundary.
          unitPriceAtPurchase: product.priceToman,
          name: asJsonInput(product.name),
          image: product.productImages[0]?.url ?? product.heroImage,
        };
      });

      // Order total in Toman. Every unit is Product.priceToman (never priceEur),
      // so the charge is identical no matter which locale started the checkout.
      const totalAmount = claimed.reduce(
        (total, product) =>
          total + product.priceToman.toNumber() * itemById.get(product.id)!,
        0,
      );

      const order = await tx.order.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          status: "pending",
          totalAmount,
          currency: "TOMAN",
          recipientName: parsed.data.recipientName,
          phone: parsed.data.phone,
          addressLine: parsed.data.addressLine,
          city: parsed.data.city,
          postalCode: parsed.data.postalCode,
        },
      });

      await tx.orderItem.createMany({
        data: orderItems.map((item) => ({ ...item, orderId: order.id })),
      });

      return {
        orderId: order.id,
        totalAmount: Number(order.totalAmount.toString()),
      };
    });

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.BETTER_AUTH_URL ??
      "http://localhost:3000";
    const callbackUrl = new URL(
      `/checkout/callback?orderId=${encodeURIComponent(createdOrder.orderId)}`,
      appBaseUrl,
    ).toString();
    const result = await requestZarinpalPayment({
      // Toman in, Rial out: `request` applies the fixed x10 at the API boundary.
      amountToman: createdOrder.totalAmount,
      description: `Order ${createdOrder.orderId}`,
      callbackUrl,
    });

    await prisma.order.update({
      where: { id: createdOrder.orderId },
      data: { zarinpalAuthority: result.authority },
    });

    return {
      ok: true,
      orderId: createdOrder.orderId,
      redirectUrl: result.redirectUrl,
    };
  } catch (error) {
    if (error instanceof StockValidationError) {
      return {
        ok: false,
        error: "Some items are no longer available in the requested quantity.",
        affectedItems: error.items,
      };
    }
    console.error("Failed to create pending order:", error);
    return {
      ok: false,
      error: "We could not create your order. Please try again.",
    };
  }
}

class StockValidationError extends Error {
  constructor(readonly items: string[]) {
    super("Cart stock validation failed");
  }
}
