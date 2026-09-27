Replace the hardcoded EUR→Rial conversion with two independent,
admin-entered prices per product: priceEur (shown to en-locale visitors,
informational only) and priceToman (shown to fa-locale visitors, and the
ONLY value ever actually charged via ZarinPal, converted ×10 to Rial at
the API call boundary — that ×10 is a fixed Toman-to-Rial fact, not a
market rate, safe to hardcode).

PART A — schema

1. In prisma/schema.prisma, replace Product.price (Decimal) with:
   priceEur Decimal, priceToman Decimal @default(0). Generate a migration
   that renames the existing price data into priceEur (preserving current
   EUR values) and adds priceToman defaulting to 0.
2. Because priceToman will be 0 for every existing product until an admin
   fills it in, treat priceToman <= 0 as "not available for purchase" —
   same disabled-button treatment as existsInStore: false (both checks
   should combine: a product needs existsInStore true AND priceToman > 0
   to show an enabled buy button). This prevents anyone from accidentally
   completing a real order at a 0 Toman price before admins finish
   backfilling.

PART B — admin form

3. Update the product zod schema and admin form to show two separate
   price inputs (priceEur, priceToman), both required, each validated as
   a positive number. Label them clearly (e.g. "Price (EUR) — shown to
   English visitors" / "Price (Toman) — shown to Persian visitors and
   charged at checkout") so it's obvious in the UI these aren't the same
   value converted, they're independently set.

PART C — public display

4. Everywhere a product price is currently displayed (product detail
   page, ProductsGrid cards, cart, order confirmation), show priceEur
   when the current locale is "en" and priceToman (formatted with the
   Persian "ریال" unit, thousands-separated per existing Persian number
   formatting conventions already used elsewhere in the app) when the
   locale is "fa" — do not show both at once.

PART D — checkout/payment

5. Remove ZARINPAL_DEFAULT_RIAL_RATE and toZarinPalAmount's EUR-based
   conversion entirely from lib/payments/zarinpal.ts. Replace with a
   direct, clearly-commented Toman→Rial conversion:
     const toRial = (toman: number) => toman * 10;
   Order creation and the ZarinPal request must always use
   product.priceToman (never priceEur) for the actual charge amount,
   regardless of which locale the checkout was initiated from.
6. OrderItem.unitPriceAtPurchase should snapshot priceToman specifically
   (rename the field or add a comment clarifying the unit is Toman) —
   this is the real transaction record and must never be ambiguous about
   currency/unit.

PART E — verification

7. Update tests/unit/payments/zarinpal.test.ts to remove the old
   rate-based conversion tests and add cases for the fixed ×10 Toman→Rial
   conversion instead.
8. Run npx tsc --noEmit, pnpm run build, pnpm test. Manually confirm: an
   English-locale product page shows the EUR price, a Persian-locale page
   shows the Toman price, and a full sandbox checkout charges exactly
   priceToman × 10 in Rial regardless of which locale you started from.
9. Report which existing products (if any) still have priceToman: 0
   after the migration, so those can be manually priced before this goes
   live — a plain list of product slugs is enough.