import type { Locale } from "./routing";

/**
 * Price display for the two independently admin-entered product prices.
 *
 * Currency rule (myPlan.md Part C):
 *  - English (`en`) shows `priceEur` — informational only, never charged.
 *  - Persian (`fa`) shows `priceToman` converted x10 to Rial and labelled with
 *    the Persian "ریال" unit. Rial is the currency ZarinPal is actually called
 *    with, so the Persian-facing price matches what the customer is charged.
 *
 * The x10 here is the fixed Toman-to-Rial fact (1 Toman = 10 Rial), not a
 * market rate — the same constant the payment layer uses. It is applied for
 * *display* only; the charged amount is computed server-side in
 * lib/payments/zarinpal.ts from the stored Toman value.
 *
 * The two prices are set independently by an admin. Nothing in this module
 * derives one from the other, and there is no exchange-rate conversion.
 */

/** 1 Toman = 10 Rial. A fixed unit fact, not a market rate. */
export const RIAL_PER_TOMAN = 10;

/** The Toman price expressed in Rial — the unit shown to Persian visitors. */
export function tomanToRial(toman: number): number {
  return toman * RIAL_PER_TOMAN;
}

/**
 * Formats an amount for the active language, following the app's existing
 * number conventions (see `formatAdminNumber` in
 * components/admin/catalog/columns.tsx): `fa-IR` for Persian — Persian digits
 * and thousands separators — and `de-DE` for the English/EUR side, matching
 * the original hardcoded formatting.
 *
 * The Rial unit is passed as a literal `"ریال"` suffix rather than through
 * `style: "currency"`: `Intl` has no Rial-specific Persian rendering we want
 * here, and the explicit suffix keeps the unit unambiguous in the markup.
 */
export function formatRial(rial: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(Math.round(rial))} ریال`;
}

/** Formats a EUR amount in the European style used across the app ("12,50 €"). */
export function formatEur(eur: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(eur);
}

/**
 * Formats a product/cart price pair for the active language, showing exactly
 * one currency — EUR for English, Rial for Persian (never both).
 *
 * `quantity` multiplies the chosen side, so line totals can use the same
 * function as unit prices.
 */
export function formatProductPrice(
  prices: { priceEur: number; priceToman: number },
  lang: Locale | string,
  quantity = 1,
): string {
  if (lang === "fa") {
    return formatRial(tomanToRial(prices.priceToman) * quantity);
  }
  return formatEur(prices.priceEur * quantity);
}
