"use server";

import { Prisma } from "@/generated/prisma/client";
import { MAX_ITEM_QUANTITY } from "@/lib/cart/limits";
import { prisma } from "@/lib/db/prisma";
import {
  buildZarinPalBaseUrl,
  request as requestZarinpalPayment,
} from "@/lib/payments/zarinpal";
import {
  claimPendingOrder,
  claimProductStock,
} from "@/lib/repositories/orders";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "../auth/auth";
import { asJsonInput } from "../repositories/casting";

// Re-exported so callers can read the limit from the action module they already
// import. Defined in `lib/cart/limits.ts` so the client cart shares the value
// without pulling this server module into the browser bundle.
export { MAX_ITEM_QUANTITY };

/**
 * Transaction budget for the checkout transaction.
 *
 * WHY THIS EXISTS (Pass 8)
 * ------------------------
 * This transaction previously passed NO options, so it ran on Prisma's
 * defaults: `maxWait: 2000`, `timeout: 5000`. Every other transaction in the
 * codebase already opts into a 30 s budget (see `ORDER_TX_OPTIONS` in
 * lib/repositories/orders/fulfillment.ts) precisely because the dev pooler is
 * remote and a cold connection can take seconds to hand over.
 *
 * Checkout is the WORST case for that default: it is the only transaction that
 * fans out to roughly `N + 3` round trips for an N-line cart, and each round
 * trip to the remote pooler measured ~320 ms. A 4-line cart therefore ran ~4.5 s
 * against a 5 s ceiling — 90 % of budget — and a bigger cart would breach it and
 * surface the pooler's opaque "Unable to start a transaction in the given time"
 * as a generic checkout failure.
 *
 * The round-trip count was ALSO reduced (see the `knownProducts` de-duplication
 * below), so this is not a timeout bump papering over a slow query. The budget
 * is raised because a 5 s wall-clock ceiling is simply too tight for a
 * multi-round-trip transaction against a pooler whose wait-to-connect is
 * invisible until it expires; 30 s matches every sibling transaction and still
 * expires far below any request timeout, so a genuine hang is still reported
 * rather than masked.
 *
 * WHAT KEEPS THE TRANSACTION FROM BECOMING A LONG LOCK HOLDER
 * ----------------------------------------------------------
 * The budget is a CEILING, not a duration. The transaction still does only
 * short, indexed writes (one guarded stock UPDATE per line, one order INSERT,
 * one OrderItem batch INSERT) and holds its row locks only for those. It never
 * awaits an external service, so there is no slow operation that could stretch
 * it toward the ceiling; reaching 30 s would mean the database itself is
 * unreachable, which is exactly when a clear failure beats a silent one.
 */
const CHECKOUT_TX_OPTIONS = { maxWait: 30_000, timeout: 30_000 } as const;

const cartItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
});

const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  recipientName: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(3).max(40),
  addressLine: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(40),
  /**
   * Duplicate-checkout guard (Pass 14). The browser generates this ONCE per
   * checkout attempt and re-sends the same value on a retry, so a
   * double-submitted form lands on the order the first request created instead
   * of creating a second one and claiming stock twice.
   *
   * Optional: a caller that omits it simply gets no deduplication, which keeps
   * this additive for any existing integration.
   */
  idempotencyKey: z.string().trim().min(1).max(120).optional(),
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
 * something releases it. `releaseOrderStock()` in lib/repositories/orders/ is
 * the release path, and `claimPendingOrder()` drives it from the two status
 * transitions that can only happen once. A customer who abandons the ZarinPal
 * page still never reaches a callback, so their reservation is held until a
 * stale-`pending` sweep exists — deferred to Pass 15.5 (see the note on
 * `releaseOrderStock`).
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

  // A quantity outside the allowed range gets its OWN message. Without this the
  // whole payload fails the schema below and the customer is told to "complete
  // every shipping field", which is both wrong and unactionable.
  if (Array.isArray(input?.items)) {
    const badQuantity = input.items.find(
      (item) =>
        !item ||
        typeof item.productId !== "string" ||
        item.productId.trim().length === 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_ITEM_QUANTITY,
    );
    if (badQuantity) {
      return {
        ok: false,
        error: `Quantities must be a whole number between 1 and ${MAX_ITEM_QUANTITY}.`,
        ...(typeof badQuantity.productId === "string"
          ? { affectedItems: [badQuantity.productId] }
          : {}),
      };
    }
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

  const { idempotencyKey } = parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Duplicate-checkout fast path. A retry carries the same key, so the
      // order it already created is returned and NO stock is claimed a second
      // time. The unique index (not this read) is what actually guarantees it:
      // see the P2002 handling below for the case where two requests interleave.
      if (idempotencyKey) {
        const existing = await tx.order.findUnique({
          where: { idempotencyKey },
          select: {
            id: true,
            userId: true,
            zarinpalAuthority: true,
          },
        });

        if (existing) {
          // Scoped to the caller: a key must never hand one account another
          // account's order.
          if (existing.userId !== session.user.id) {
            throw new IdempotencyConflictError();
          }
          return {
            duplicate: true as const,
            orderId: existing.id,
            authority: existing.zarinpalAuthority,
          };
        }
      }

      const products = await tx.product.findMany({
        where: { id: { in: [...itemById.keys()] } },
        // Only the columns the order actually needs — the order line is a
        // snapshot of these five, and nothing else is read.
        //
        // `slug` / `existsInStore` / `priceToman` are ALSO the fields the stock
        // claim needs for its "gone / not purchasable" classification, so this
        // one read serves BOTH the snapshot and the claim. That is deliberate
        // (Pass 8): the claim used to re-read these same rows one at a time,
        // which cost a full round trip per line against the remote pooler for
        // information already in hand. See `known` below.
        select: {
          id: true,
          slug: true,
          name: true,
          priceToman: true,
          existsInStore: true,
          heroImage: true,
          productImages: {
            select: { url: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
      });

      // Feed the claim the rows just read, so it does not re-read one row per
      // line. This is purely a de-duplication of reads: the availability
      // DECISION is still the guarded `updateMany` inside `claimProductStock`,
      // so passing a stale map could never let an unavailable claim through.
      const knownProducts = new Map(
        products.map((product) => [product.id, product]),
      );

      // Claim every line's stock as part of THIS transaction. The claim is
      // atomic per product (see claimProductStock): the availability rule is in
      // the UPDATE's WHERE clause, so two concurrent checkouts for the last
      // unit cannot both succeed. A read-then-write check would not hold — both
      // transactions would read the same pre-decrement quantity and both pass.
      const { claimedIds, unavailable } = await claimProductStock(
        [...itemById].map(([productId, quantity]) => ({ productId, quantity })),
        tx,
        knownProducts,
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

      // Order total in Toman, summed with DECIMAL arithmetic — not JS numbers.
      // Every unit is Product.priceToman (never priceEur), so the charge is
      // identical no matter which locale started the checkout. Decimal keeps
      // the result exact for any magnitude the column can hold, where
      // `toNumber() * quantity` could silently lose precision past 2^53.
      let total = new Prisma.Decimal(0);
      for (const product of claimed) {
        total = total.plus(product.priceToman.mul(itemById.get(product.id)!));
      }

      const order = await tx.order.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          status: "pending",
          totalAmount: total,
          currency: "TOMAN",
          ...(idempotencyKey ? { idempotencyKey } : {}),
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
        duplicate: false as const,
        orderId: order.id,
        totalAmount: Number(order.totalAmount.toString()),
      };
    }, CHECKOUT_TX_OPTIONS);

    // A retry that hit an existing order: send the customer back to the SAME
    // payment page rather than creating a second order.
    if (created.duplicate) {
      if (!created.authority) {
        // The first attempt never got an authority (its gateway call failed and
        // the order was released). Tell the customer to start over rather than
        // sending them to a payment URL that does not exist.
        return {
          ok: false,
          error: "This checkout could not be completed. Please try again.",
        };
      }
      return {
        ok: true,
        orderId: created.orderId,
        redirectUrl: `${buildZarinPalBaseUrl()}/pg/StartPay/${created.authority}`,
      };
    }

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.BETTER_AUTH_URL ??
      "http://localhost:3000";
    const callbackUrl = new URL(
      `/checkout/callback?orderId=${encodeURIComponent(created.orderId)}`,
      appBaseUrl,
    ).toString();

    let result;
    try {
      result = await requestZarinpalPayment({
        // Toman in, Rial out: `request` applies the fixed x10 at the API boundary.
        amountToman: created.totalAmount,
        description: `Order ${created.orderId}`,
        callbackUrl,
      });
    } catch (gatewayError) {
      // The order and its stock reservation already committed, but without an
      // authority it can never be paid. Settle it to `failed`, which also
      // returns the reservation to stock (see claimPendingOrder) — otherwise a
      // failed payment initialisation would hold the inventory forever.
      await settleUnpayableOrder(created.orderId);
      console.error("ZarinPal request failed for order", created.orderId, gatewayError);
      return {
        ok: false,
        error: "We could not reach the payment gateway. Please try again.",
      };
    }

    await prisma.order.update({
      where: { id: created.orderId },
      data: { zarinpalAuthority: result.authority },
    });

    return {
      ok: true,
      orderId: created.orderId,
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
    if (error instanceof IdempotencyConflictError) {
      return {
        ok: false,
        error: "This checkout could not be completed. Please try again.",
      };
    }
    if (isIdempotencyCollision(error)) {
      // Two requests with the same key interleaved: this one lost the unique
      // index race, so its transaction rolled back (releasing the stock it had
      // claimed). Return the order the winner created.
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: idempotencyKey! },
        select: { id: true, userId: true, zarinpalAuthority: true },
      });
      if (existing && existing.userId === session.user.id && existing.zarinpalAuthority) {
        return {
          ok: true,
          orderId: existing.id,
          redirectUrl: `${buildZarinPalBaseUrl()}/pg/StartPay/${existing.zarinpalAuthority}`,
        };
      }
      return {
        ok: false,
        error: "This checkout is already being processed. Please check your orders.",
      };
    }
    console.error("Failed to create pending order:", error);
    return {
      ok: false,
      error: "We could not create your order. Please try again.",
    };
  }
}

/**
 * Marks an order the gateway could not be asked to pay for as `failed`,
 * returning its stock reservation.
 *
 * Routed through `claimPendingOrder` rather than a plain update so the
 * `pending → failed` transition is guarded (a concurrent callback cannot
 * double-release) and the stock movement commits with the status.
 *
 * Failure here is swallowed on purpose: the caller is already on an error path
 * and must still return a usable message. A stale `pending` order is the
 * acceptable outcome, and the Pass 15.5 sweep is the backstop for it.
 */
async function settleUnpayableOrder(orderId: string): Promise<void> {
  try {
    await claimPendingOrder({
      orderId,
      status: "failed",
      txOptions: { maxWait: 30_000, timeout: 30_000 },
    });
  } catch (error) {
    console.error("Failed to release stock for unpayable order", orderId, error);
  }
}

/**
 * Whether an error is a unique-index violation on `Order.idempotencyKey`.
 *
 * The meta shape differs between Prisma's classic engine (`meta.target`) and
 * the driver adapters used here (`meta.driverAdapterError.cause.constraint
 * .fields`), so both are checked — the same two-shape handling
 * lib/admin/result-server.ts documents. Matching on the column name as well as
 * the code keeps an unrelated P2002 from being mistaken for a checkout replay.
 */
function isIdempotencyCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;

  const meta = error.meta as
    | {
        target?: unknown;
        driverAdapterError?: {
          cause?: { constraint?: { fields?: unknown } };
        };
      }
    | undefined;
  if (!meta) return false;

  const collect = (value: unknown): string[] => {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
    return [];
  };

  const fields = [
    ...collect(meta.target),
    ...collect(meta.driverAdapterError?.cause?.constraint?.fields),
  ];
  return fields.some((field) => field.split(".").pop() === "idempotencyKey");
}

class StockValidationError extends Error {
  constructor(readonly items: string[]) {
    super("Cart stock validation failed");
  }
}

/** The supplied idempotency key already belongs to a different account. */
class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key belongs to another user");
  }
}
