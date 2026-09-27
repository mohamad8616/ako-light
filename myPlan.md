Build the checkout and payment flow for ako-light-cline: cart stays
client-side as it is today; a real Order is only created in the database
at checkout time, paid for via ZarinPal (sandbox mode first).

PART A — schema

1. Add to prisma/schema.prisma:
   - Order: id, userId (FK to User.id), status (enum: pending, paid,
     failed, cancelled — Prisma enum), totalAmount (Decimal, same unit as
     Product.price — confirm and document which unit that is), currency
     (String, default matching that unit), zarinpalAuthority (String?,
     nullable until the payment request succeeds), zarinpalRefId (String?,
     nullable until verified), shipping address fields (recipientName,
     phone, addressLine, city, postalCode — plain fields on Order for
     this pass, not a separate reusable Address model, to keep scope
     tight), createdAt/updatedAt.
   - OrderItem: id, orderId (FK), productId (FK to Product.id),
     quantity Int, unitPriceAtPurchase (Decimal — snapshot the price at
     order time, never read live Product.price for a past order), plus
     enough denormalized product info (name Json, image) to display order
     history even if the product is later deleted or renamed.
   Generate one migration.

PART B — checkout page + order creation

2. A checkout page (app/[locale]/(site)/checkout/page.tsx or similar) —
   requires an authenticated session (redirect to /sign-in with a
   callback if not signed in, same pattern as elsewhere). Reads the
   current client-side cart, presents an address form, and on submit:
   - Creates the Order + OrderItems in a single transaction, status
     "pending", snapshotting current price/name/image per item.
   - Validates each item's existsInStore/quantity server-side before
     creating the order (don't trust client-side cart state for stock —
     reject or adjust quantity if a product went out of stock since it
     was added to the cart, and tell the customer clearly which item(s)
     were affected).

PART C — ZarinPal integration

3. Create lib/payments/zarinpal.ts with a request() and verify()
   function, calling ZarinPal's v4 JSON API. Before writing this, verify
   the exact currency unit expected against real ZarinPal documentation
   (not just my summary above) — if there's any doubt, use sandbox mode
   and log the request/response clearly during testing so a wrong-unit
   bug is obvious immediately rather than silently 10x/0.1x wrong.
   Env vars: ZARINPAL_MERCHANT_ID, ZARINPAL_MODE (sandbox|production),
   documented in .env.example.
4. After creating the pending Order, call request() with the order's
   totalAmount, a description, and a callback URL
   (/checkout/callback?orderId=...), store the returned Authority on the
   Order, and redirect the customer to ZarinPal's hosted payment page.
5. Build the callback route (app/[locale]/(site)/checkout/callback/page.tsx
   or a route handler) that receives Authority + Status from ZarinPal,
   calls verify() with the matching amount, and updates the Order's
   status to "paid" (storing zarinpalRefId) or "failed" accordingly.
   Never trust the client-side Status param alone — always call verify()
   server-side before marking anything paid.
6. On successful payment: clear the client-side cart, show an order
   confirmation page with the ref_id. On failure: show a clear error and
   let the customer retry (don't leave a dangling "pending" order forever
   — either allow retry against the same Order or mark it "failed" and
   let them start a new checkout).

PART D — verification

7. Run npx tsc --noEmit, pnpm run build, pnpm test. Manually confirm a
   full sandbox round-trip: add items to cart, checkout, get redirected
   to ZarinPal's sandbox payment page, complete a test payment, land back
   on a confirmation page with a real ref_id, and confirm the Order row
   in the database shows status "paid" with the correct total.

Report back: which currency unit you confirmed ZarinPal expects and how
you verified it, and paste the actual sandbox round-trip result (order
id, ref_id, final status) rather than just "it worked."