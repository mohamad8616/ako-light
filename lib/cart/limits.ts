/**
 * Cart quantity limits — the ONE place this number is defined.
 *
 * Both sides import it: the client cart clamps to it so the UI cannot build a
 * basket the server will reject, and `createPendingOrder` enforces it so a
 * hand-crafted request cannot exceed it. Keeping it here rather than in
 * `lib/actions/checkout.ts` matters — that module is `"use server"` and imports
 * Prisma and the payment gateway, so a client module importing a constant from
 * it would drag all of that into the browser bundle.
 */
export const MAX_ITEM_QUANTITY = 1_000;

/** Clamp any incoming quantity into the valid `1..MAX` range. */
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.trunc(quantity)));
}
