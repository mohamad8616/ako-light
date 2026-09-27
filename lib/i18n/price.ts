import type { Locale } from "./routing";

/**
 * Price display for the two independently admin-entered product prices.
 *
 * Currency rule:
 *  - English (`en`) shows `priceEur` — informational only, never charged.
 *  - Persian (`fa`) shows the raw `priceToman` value labelled with the Persian
 *    "تومان" unit. The stored number is displayed as-is: no x10, no conversion.
 *
 * The x10 Toman-to-Rial conversion (1 Toman = 10 Rial — a fixed unit fact, not a
 * market rate) belongs to the PAYMENT layer only. It is applied inside
 * lib/payments/zarinpal.ts (`toRial`) at the moment ZarinPal is called, because
 * Rial is the currency the gateway actually charges in. It must never be
 * applied as part of price display: Toman is what the customer sees on screen,
 * Rial is what is charged behind the scenes.
 *
 * `tomanToRial` / `RIAL_PER_TOMAN` / `formatRial` are deliberately retained for
 * the one place that legitimately needs the charged Rial figure: the checkout
 * confirmation page
 * (app/[locale]/(site)/checkout/callback/page.tsx) renders the amount actually
 * charged, in Rial. They are unreachable from the catalog/cart display path.
 *
 * The two prices are set independently by an admin. Nothing in this module
 * derives one from the other, and there is no exchange-rate conversion.
 */

/** 1 Toman = 10 Rial. A fixed unit fact, not a market rate. */
export const RIAL_PER_TOMAN = 10;

/**
 * The Toman price expressed in Rial — the amount ZarinPal actually charges.
 * Retained for the checkout confirmation page only (see the module header);
 * the catalog/cart display path uses `formatToman` instead.
 */
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

/**
 * Formats a Toman amount for Persian visitors — the unit customers actually see
 * on screen, and it is shown unconverted: the value passed in is the stored
 * Toman number as-is (no x10 Rial conversion in the display path).
 *
 * Same `fa-IR` rendering as `formatRial` (Persian digits and thousands
 * separators); only the unit suffix differs, `"تومان"` instead of `"ریال"`.
 */
export function formatToman(toman: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(Math.round(toman))} تومان`;
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
 * one currency — EUR for English, Toman for Persian (never both).
 *
 * The Persian side is the RAW Toman value: no x10 conversion happens here (see
 * the module header).
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
    // Raw Toman, unconverted: the x10 Rial conversion is a payment-boundary
    // concern (lib/payments/zarinpal.ts), never a display one.
    return formatToman(prices.priceToman * quantity);
  }
  return formatEur(prices.priceEur * quantity);
}
