import type { CartItem } from "./store";

export interface CheckoutResult {
  url: string;
}

/**
 * Hands the current cart off to your real backend at checkout time. This
 * client-side cart (Zustand + persist) stays the source of truth for
 * "what's in the cart" in the browser — this function's only job is to
 * ask the backend to turn that into a payable checkout session and give
 * back a URL to redirect the customer to.
 *
 * Wire app/api/checkout/route.ts to whichever platform you're using:
 *
 * - Shopify Storefront API: `cartCreate` / `cartLinesAdd` mutations,
 *   then return `cart.checkoutUrl`.
 * - Stripe: server-side `stripe.checkout.sessions.create({ line_items,
 *   mode: "payment", success_url, cancel_url })`, return `session.url`.
 * - Custom API: create an order/cart record, return your own checkout
 *   route's URL.
 */
export async function createCheckout(items: CartItem[]): Promise<CheckoutResult> {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Checkout failed.");
  }

  return response.json();
}
