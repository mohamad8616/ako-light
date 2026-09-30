"use server";

/**
 * Server actions supporting the durable cart-reset signal.
 *
 * See lib/cart/reset-signal.ts for why the "empty the cart" instruction is
 * carried server-side rather than being a one-shot client effect.
 */
import { clearCartResetSignal } from "@/lib/cart/reset-signal";

/**
 * Clears the cart-reset cookie once the browser has acted on it.
 *
 * Called by the client component AFTER it has emptied the persisted cart, so a
 * failed clear is retried on the next page load rather than being lost.
 */
export async function acknowledgeCartReset(): Promise<void> {
  await clearCartResetSignal();
}
