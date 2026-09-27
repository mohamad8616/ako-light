"use server";

import { prisma } from "@/lib/db/prisma";
import { request as requestZarinpalPayment } from "@/lib/payments/zarinpal";
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
      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );
      const affectedItems: string[] = [];

      for (const [productId, quantity] of itemById) {
        const product = productsById.get(productId);
        if (!product) {
          affectedItems.push(productId);
          continue;
        }
        if (!product.existsInStore || product.quantity < quantity) {
          affectedItems.push(product.slug);
        }
      }

      if (affectedItems.length > 0) {
        throw new StockValidationError(affectedItems);
      }

      const orderItems = products.map((product) => {
        const quantity = itemById.get(product.id)!;
        return {
          id: crypto.randomUUID(),
          productId: product.id,
          quantity,
          unitPriceAtPurchase: product.price,
          name: asJsonInput(product.name),
          image: product.productImages[0]?.url ?? product.heroImage,
        };
      });

      const totalAmount = products.reduce(
        (total, product) =>
          total + product.price.toNumber() * itemById.get(product.id)!,
        0,
      );

      const order = await tx.order.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          status: "pending",
          totalAmount,
          currency: "EUR",
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

      return { orderId: order.id, totalAmount: Number(order.totalAmount.toString()) };
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
      amount: createdOrder.totalAmount,
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
