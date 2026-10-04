/**
 * Dictionary lookups for order status copy.
 *
 * The dictionaries are `as const`, so a template-literal key like
 * `` t[`orders.payment.${status}`] `` does not type-check — the compiler cannot
 * prove the key exists. These helpers take the dictionary as a plain
 * `Record<string, string>` and fall back to the raw value, so an unknown status
 * (a future enum member, or a row written by an older deploy) renders as its
 * machine name instead of crashing the page.
 *
 * Kept in one place so the history list and the detail page cannot drift.
 */

/** `Order.status` → `orders.payment.*` copy. */
export function paymentStatusLabel(
  t: Record<string, string>,
  status: string,
): string {
  return t[`orders.payment.${status}`] ?? status;
}

/** `Order.fulfillmentStatus` → `orders.fulfillment.*` copy. */
export function fulfillmentStatusLabel(
  t: Record<string, string>,
  status: string,
): string {
  return t[`orders.fulfillment.${status}`] ?? status;
}
