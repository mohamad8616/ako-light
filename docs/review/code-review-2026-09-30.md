# Code Review — ako-light-cline / Home Form

**Date:** 2026-09-30
**Scope:** whole repo, excluding `.gitignore`d paths (`node_modules/`, `.next/`, `home-form/`, `coverage/`, `.vitest/`, `generated/` build output, `*.tsbuildinfo`, `next-env.d.ts`).
**Baseline verified during this review:** `tsc --noEmit` clean · `unit` tier 549 pass / 0 fail · full suite 701 pass / 8 fail (all environmental — see §5).

Line counts below are real `wc -l` numbers on the tracked source.

---

## 1. Executive summary

The codebase is unusually well-documented and well-tested for its size (~35.7k lines of app source + ~15.7k lines of tests). The layering (`app/` → `components/` → `lib/repositories/` → Prisma) is respected, admin mutations all re-authorize server-side, and the i18n dictionary already demonstrates the exact "split one big module into per-domain pure-data files + a barrel" pattern you want applied elsewhere.

The problems are concentrated in four areas:

| Area | Severity | Headline |
|---|---|---|
| **Correctness** | **Critical** | Paid orders never decrement `Product.quantity` — stock is checked at checkout but never consumed. Oversell is guaranteed. |
| **Performance** | **High** | The full 1,763-line / 108 KB translation dictionary ships to every client because `LanguageProvider` (a client component) imports the barrel. |
| **Performance** | **High** | `getProductCategories()` eager-loads *every product and every product image* and is called from the `(site)` layout — i.e. on every public page. |
| **Structure** | Medium | `lib/repositories/homepage-features.ts` (679 lines) is 5 near-identical resolver/upsert pairs; `admin.ts` translations (824 lines) is 2 × 416 near-mirrored halves. |
| **Duplication** | Medium | Two unrelated `DataTable` implementations; 6 hand-rolled `Intl.NumberFormat`/`DateTimeFormat` sites; 4 copies of `fa-IR ? :` locale ternaries; repeated `db === prisma ? … : …` transaction boilerplate. |

Recommended order of work: **§3 (bugs) → §4.1/§4.2 (the two high-impact perf fixes) → §4.4 (split the barrel consumers)** then the structural splits in §6, which are mechanical once the perf work has proven the pattern.

---

## 2. Largest files (refactor candidates)

### 2.1 Application code — 250+ lines

| Lines | File | Verdict |
|---:|---|---|
| 824 | `lib/i18n/translations/admin.ts` | **Split** — see §6.1 |
| 739 | `components/ui/sidebar.tsx` | Leave — shadcn/base-ui primitive |
| 679 | `lib/repositories/homepage-features.ts` | **Split** — see §6.2 |
| 474 | `lib/repositories/products.ts` | **Split** — see §6.3 |
| 398 | `components/signIn/useSignInForm.ts` | **Split** — see §6.4 |
| 376 | `components/admin/dashboard/data-table.tsx` | **Delete/replace** — see §7.1 |
| 372 | `components/ui/chart.tsx` | Leave — shadcn primitive |
| 335 | `components/search/SearchResults.tsx` | Medium — split index building out |
| 331 | `components/admin/catalog/fields/ListFields.tsx` | Medium — see §6.5 |
| 327 | `components/admin/catalog/products/ProductForm.tsx` | Medium — extract card sections |
| 315 | `components/admin/catalog/admins/AdminsTable.tsx` | Medium |
| 308 | `components/admin/catalog/flagships/FlagshipForm.tsx` | Medium |
| 289 | `components/admin/catalog/designers/DesignersTable.tsx` | Medium |
| 287 | `lib/repositories/projects.ts` | Medium — mirrors `products.ts` |
| 279 | `components/admin/ImageUpload.tsx` | Medium — two components in one file |
| 268 | `components/cart/ProductModal.tsx` | Medium |
| 268 | `app/[locale]/(admin)/admin/orders/[id]/page.tsx` | Medium |
| 266 | `components/admin/catalog/product-categories/ProductCategoriesTable.tsx` | Medium |
| 257 | `components/ui/imageGalleryCarousel/LightboxModal.tsx` | Leave — already split |
| 257 | `components/cart/CartSheet.tsx` | Medium |
| 257 | `components/admin/catalog/catalogue/CatalogueTable.tsx` | Medium |

**Do not split** `components/ui/*.tsx` (sidebar, chart, drawer, dropdown-menu, field, sheet, dialog, select, table). These are vendored shadcn/base-ui primitives; re-generating them is how you update them, and local surgery creates merge debt. The only exception worth touching is `chart.tsx`, which is only ever used by one admin page — see §4.3.

### 2.2 Tests

`tests/helpers/auth-db.ts` at **1,139 lines** is the largest single file in the repo. It is test infrastructure rather than a test, but at that size it should be decomposed into `auth-db/{signup,otp,fetch-when-warm,db}.ts`. Two test files also cross 500 lines (`slug-history-actions.test.ts` 586, `order-receipt.test.ts` 507) — acceptable for data-driven suites, but they are the ones that stall the whole run when the dev server misbehaves.

### 2.3 The pattern you asked to follow

`lib/i18n/translations.ts` (18 lines) is a barrel over 17 per-domain pure-data modules, with `index.ts` composing them. The equivalent moves for the big non-data files are listed in §6, and `components/ui/imageGalleryCarousel/` (`hooks.ts`, `helpers.ts`, `constants.ts`, `types.ts`, `Slide.tsx`, `MobileColumn.tsx`, `index.ts`) is an in-repo precedent for splitting a *component* the same way — hooks and pure helpers out, one component per file, barrel at the end.

---

## 3. Bugs

### 3.1 🔴 CRITICAL — Stock is never decremented after a paid order

`lib/actions/checkout.ts` validates stock inside the transaction:

```ts
if (!product.existsInStore || product.quantity < quantity || …) {
  affectedItems.push(product.slug);
}
```

…then creates the order. **Nothing anywhere ever decrements `Product.quantity`.** Searching the whole `lib/` tree for a decrement or a `quantity` write outside the product CRUD form returns nothing:

```
grep -rn "decrement|quantity:" lib/  →  only repositories/orders.ts read paths
```

Consequences:
- Every order can be placed again at the same quantity, forever.
- The checkout guard `product.quantity < quantity` is permanently satisfied for the same inventory, so it provides no protection at all.
- `Product.existsInStore` never flips to `false` on sell-out.

**Fix (recommended):** decrement inside the *same* transaction that creates the order, with a guarded update so two concurrent checkouts cannot both win:

```ts
// inside the existing prisma.$transaction
const claimed = await tx.product.updateMany({
  where: { id: product.id, quantity: { gte: quantity }, existsInStore: true },
  data: { quantity: { decrement: quantity } },
});
if (claimed.count === 0) { affectedItems.push(product.slug); continue; }
```

This makes the check-and-decrement atomic and removes the need for the separate pre-check loop. Also decide what happens on `status: "failed"` / abandoned `pending` orders — a `pending → failed` transition should restore the reservation, or you need a sweep job for stale pendings (see 3.2).

### 3.2 🟠 HIGH — Orders leak `pending` forever on abandoned payment

`app/[locale]/(site)/checkout/callback/page.tsx` only writes a terminal status when the customer actually returns from the gateway. A customer who opens the ZarinPal page and closes it leaves the order `pending` indefinitely. With the §3.1 fix in place, that reserved stock never comes back.

**Fix:** add a `revalidate`-friendly sweep (a route handler or cron) that fails `pending` orders older than N minutes and restores their reserved quantity. Track reservation with a `stockReserved: boolean` / `reservedUntil` column so the restore is idempotent.

### 3.3 🟠 HIGH — Duplicate verification is possible on retry paths

ZarinPal returns code `101` for "already verified" (`isVerificationSuccess` accepts 100 *and* 101). The callback re-verifies on every visit and re-sends the receipt only when the pre-update status was not `paid`:

```ts
const alreadyPaid = order.status === "paid";
```

That guard is correct for a *refresh*, because the first visit sets `status: "paid"`. But because the two DB writes are not atomic with respect to `verify()`, two concurrent requests (e.g. the customer double-clicking, or the gateway retrying) can both read `alreadyPaid === false` and both call `sendOrderReceipt`. The receipt send is idempotent-ish (it just sends twice), but the failure mode is a duplicate SMS/email to the customer.

**Fix:** make the transition the concurrency guard rather than a prior read — `updateMany({ where: { id, status: { not: "paid" } }, data: { status: "paid", … } })` and only send the receipt when `count === 1`.

### 3.4 🟠 HIGH — `SmoothScroll` ticker never unregisters

`components/smoothScroll.tsx` (which wraps **the entire app**, including `/admin`):

```ts
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
// …
return () => {
  lenis.destroy();
  setLenis(null);
  gsap.ticker.remove((time) => lenis.raf(time * 1000)); // ← different closure!
};
```

The cleanup removes a *newly created* arrow function, not the one that was added. GSAP's `ticker.remove` is identity-based, so the original callback stays registered forever. The captured `lenis` is destroyed, so the stale ticker keeps calling `raf()` on a destroyed instance on every animation frame.

**Fix:** hoist the callback so the same reference is added and removed:

```ts
const onTick = (time: number) => { lenis.raf(time * 1000); };
gsap.ticker.add(onTick);
return () => { gsap.ticker.remove(onTick); lenis.destroy(); setLenis(null); };
```

Also note the effect runs for `/admin` too — the admin dashboard does not want Lenis smooth-scroll or a rAF loop, and `lenisStore` consumers (CartSheet, ProductModal, VideoModal, LightboxModal, ProductsSheet, fullScreenMenu, PageLoader) all then work off a shared instance that never dies. Consider mounting `<SmoothScroll>` only inside the `(site)` layout.

### 3.5 🟡 MEDIUM — `formatOrderAmount` divides by locale, not by currency

```ts
if (locale === "fa") return formatToman(total);
return `${new Intl.NumberFormat("en-US").format(total)} ${currency}`;
```

This is correct today only because the Persian flow is the only one that reaches checkout. But `Order.currency` is stored, and the function's name promises a currency-aware format. An English-locale visitor who somehow completes a Toman order would see `1250000 TOMAN` rather than a localized amount. It is a latent trap rather than a live bug — either key off `currency` or rename the function to `formatOrderAmountForLocale` and document that checkout is Persian-only.

### 3.6 🟡 MEDIUM — `clearCart()` is never called after a successful payment

`lib/cart/store.ts` exposes `clearCart`, and `CheckoutForm` redirects to the gateway without clearing. The cart state survives in `localStorage` (`henge-cart`) across the whole gateway round-trip, so a returning customer finds the purchased items still in the cart and can order them again.

**Fix:** clear the cart on the success branch of the callback (or on `createPendingOrder` success — but do not clear on failure paths, or the customer loses their cart when a gateway request fails).

### 3.7 🟡 MEDIUM — Two `notFound()`-adjacent 500s in the callback

`getMerchantId()` throws when `ZARINPAL_MERCHANT_ID` is unset, and the throw is caught by the surrounding `try` and converted into a `status: "failed"` write plus a "verification failed" message. That is deliberate (fail closed), but it also means **a misconfigured deployment silently marks real paid orders as failed** rather than surfacing a configuration error. A missing merchant id should be a hard 500 with a loud log, not a status mutation.

### 3.8 🟡 LOW — `hint ?? optional` swallows the optional marker

`components/admin/catalog/fields/form.tsx`:

```tsx
{hint ?? (optional ? <span>{t("admin.crud.optional")}</span> : null)}
```

A field that is both `hint`-carrying and `optional` renders only the hint; the "optional" affordance is lost. Prefer rendering both.

### 3.9 🟡 LOW — `useSignInForm` returns two un-memoised functions

`handleEmailSubmit`, `handleSubmit`, `updateField`, `changeMode`, `changeMethod` are recreated on every render, while `handlePhoneSubmit`, `handleEditNumber`, `goToAfterAuth` are `useCallback`-wrapped. The mix is inconsistent and `handlePhoneSubmit`'s dependency array (`t`) changes identity whenever the provider re-renders. Low impact, but it defeats the memoisation of the sibling callbacks that depend on them.

### 3.10 🟡 LOW — Dead `optional`/`emptyMessage`/`searchable` props

`components/admin/data-table/DataTable.tsx` declares `searchable` and `emptyMessage` in `DataTableProps` and destructures neither, and takes `pageSize` while silently ignoring `className`'s partner `searchable`. Dead API surface invites callers to pass props that do nothing.

---

## 4. Performance

### 4.1 🔴 HIGH — The whole translation dictionary ships to every browser

`lib/i18n/LanguageProvider.tsx` is a **client component** and imports the barrel:

```ts
import { translations, type TranslationKey } from "./translations";
```

`translations` re-exports all 17 modules — **107,667 bytes across 1,763 lines**, of which `admin.ts` alone is 43,347 bytes and is only ever needed on `/admin`. Because `LanguageProvider` wraps the entire app from `app/[locale]/layout.tsx`, the whole dictionary for both languages is in the client bundle on the public marketing site, where roughly 43 KB of it can never be read.

There are **37 import sites** of `@/lib/i18n/translations`, including two client components (`components/admin/dashboard/data-table.tsx`, `components/search/SearchResults.tsx`) which each pull it in independently.

**Fix — keep the URL-driven API, change what crosses the boundary:**

1. Keep the server-side barrel exactly as-is (server components can afford it).
2. Split the client dictionary by *surface*: `translations/site.ts` (everything except `admin.*`) and `translations/admin.ts`. The public layout passes only the site dictionary to `LanguageProvider`; the admin layout passes `{...site, ...admin}`.
3. Long term, replace the context payload with per-request `getDictionary(locale)` in the server layout and thread it as a prop, so the client receives strings only for the subtree that renders.

Expected win: roughly **40–50 KB of dead JS removed from every public page**, plus the removal of a second copy on admin pages.

### 4.2 🔴 HIGH — `getProductCategories()` over-fetches the whole catalog on every page

`lib/repositories/product-categories.ts`:

```ts
export const productCategoryInclude = {
  products: { include: productInclude, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductCategoryInclude;
```

`productInclude` pulls `category`, `designer` **and every `ProductImage` row for every product**. `getProductCategories()` returns all of that. It is called from:

- `app/[locale]/(site)/layout.tsx` — so **every public page** (about, contact, designers, projects, collections, flagship, s34, search…) pays for the entire catalog with images, solely to pass categories to `Navbar` → `ProductsSheet`.
- `app/[locale]/(site)/products/page.tsx` and every `generateMetadata` that needs a category.

`React.cache()` de-dupes within a request, so the cost is paid once per request — but it is paid on pages that only need category *names and slugs* for a nav menu.

**Fix:** split the read into two shapes and use the cheap one for navigation:

```ts
// Navigation: names + slugs only, no products, no images.
export const getProductCategoryNav = cache(async () => {
  const rows = await prisma.productCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, i18nKey: true },
  });
  return rows.map(/* … */);
});
```

Then thread the nav shape through `Navbar`/`ProductsSheet` and reserve the full `getProductCategories()` for the catalog screens that actually render products.

### 4.3 🟠 HIGH — `generateStaticParams` runs a full unbounded query per route

Four routes call a full-table read at build time:

```ts
// products/[product]/[prod]/page.tsx
const allProducts = await getProducts();       // every product + images
// products/[product]/page.tsx
const categories = await getProductCategories(); // every category + all products + images
// designers/[slug]/page.tsx
const allDesigners = await getDesigners();
// flagship/[slug]/page.tsx
const headlines = await getFlagshipOneFeature…  // etc.
```

Each is a legitimate need (you need the slugs), but none needs the payload. The products route additionally does **two** full reads — `getProducts()` in `generateStaticParams`, then `getProducts()` *again* at line 34 of the page body plus `getProductsByCategory(product)` at 131 — and then filters the full list in JS to find the sibling products.

**Fix:**
- Add slug-only readers (`select: { slug: true }`, and `{ slug, categorySlug }` for the nested route) for `generateStaticParams`.
- Replace the "fetch all products then filter" sibling lookup with the existing `getProductsByCategory(product)` and drop the extra `.filter()`.

### 4.4 🟠 HIGH — Entire catalog serialized into the client for search

`app/[locale]/(site)/search/page.tsx` fetches `getProducts()` **and** `getDesigners()` and passes both into `SearchHeader` → `SearchResults`, which is `"use client"`. That means the RSC payload for `/search` contains every product (name, all images, prices, related, downloads…) and every designer, and it is re-serialized on the client for index building on every keystroke-adjacent render.

**Fix (choose one):**
- Move the index build server-side and pass a compact array of `{ id, slug, category, label, haystack }` (no images, no prices). This is the cheapest change and needs no new endpoint.
- Or add a `/api/search?q=` route handler that queries Postgres (`ILIKE` / `pg_trgm`) and only ships results — the right answer if the catalog grows.

### 4.5 🟡 MEDIUM — 40 client components pull `framer-motion`

`framer-motion` (v12) is imported by **40 files**, and every one of them is `"use client"`. The `(site)` layout is a server component but `PageTransition` (client, framer-motion) sits directly under it, so the library is on the critical path for the first paint of every public page. The library is used for genuinely small effects in most of these files (fades, staggered text).

**Fix:** for the simple fade/`opacity` cases, CSS transitions/keyframes or `view-transition` are equivalent and cost nothing. Keep framer-motion for the few components with real gesture or layout animation, and lazy-load those. Also `components/smoothScroll.tsx` pulls `gsap` + `gsap/ScrollTrigger` + `lenis` into the same critical path for one rAF loop (§3.4).

### 4.6 🟡 MEDIUM — `components/ui/chart.tsx` (372 lines) + `recharts` for one admin page

`recharts` is imported by exactly two files: `components/ui/chart.tsx` and `components/admin/dashboard/chart-area-interactive.tsx`. That is a large dependency serving a single dashboard widget. `dynamic(() => import(...), { ssr: false })` on that page would keep recharts out of the shared chunk; or drop the chart entirely if the stat cards already carry the signal.

### 4.7 🟡 MEDIUM — `next.config.ts` disables image optimization in dev with a commented-out `qualities`

`unoptimized: process.env.NODE_ENV !== "production"` is documented and intentional (the dev optimizer 504s in this environment). Worth noting because it means **image regressions are invisible in dev** — a bad `sizes`/`fill` produces no warning until production. Also `deviceSizes` is hand-narrowed to 4 widths, which is good for optimizer load but will under-serve large viewports.

### 4.8 🟡 LOW — Fonts: 10 `woff2` files across 3 families, all preloaded

`app/[locale]/layout.tsx` declares Noora at **7 weights** (100–800), plus JetBrainsMono ×2 and DinNext ×1. `next/font/local` preloads what is declared; only a couple of weights are typically used per family. Trimming Noora to the weights actually referenced in `globals.css` reduces preloaded font bytes meaningfully. Worth a quick audit of which `font-weight` values actually appear.

---

## 5. Tests

### 5.1 Current state (measured in this review)

```
npx tsc --noEmit         → clean
vitest run --project unit → PASS (549) FAIL (0)
pnpm test (all tiers)     → PASS (701) FAIL (8)
```

The 8 failures are **all in the `auth` tier**, all the same root cause, and all environmental:

```
PageNotFoundError: Cannot find module for page: /api/auth/[...all]/route
```

The in-process dev server serves 404/500 for routes that demonstrably exist. This is the stale `.next/dev` / denied Turbopack cache write issue already recorded in the project log. It is **not a regression** — the same files passed under the same code earlier. Recommended hygiene: `mv .next/dev .next/dev-old` before an auth-tier run, and re-run.

### 5.2 What is well covered

- **Admin schemas** — every entity has a dedicated test, plus an `adversarial.test.ts` and `common.test.ts`. This is the best-covered surface in the repo.
- **Authorization** — separate suites for no-session, wrong-role, admins-denied, owner-boundary, self-target rejection, and a *live* server suite that exercises real sessions against the real DB. The layering (`proxy.ts` refuses plain users before `requireOwnerAccess()` sees them) is explicitly tested.
- **Slug history** — 499 + 586 + 326 lines across integration, server, and action tiers. Genuinely thorough.
- **FK integrity** — `catalog-fk.test.ts`, `slug-change-fk.test.ts`.

### 5.3 Gaps

| Gap | Risk | Note |
|---|---|---|
| **No component/render tier at all** | High | `vitest.config.ts` states it plainly: "No jsdom/Renderer environment is needed yet — component and E2E tests are later checkpoints." Every one of the 204 components is untested. This is where §3.5–3.8 bugs live. |
| **Checkout / payment** | **High** | `lib/actions/checkout.ts` and the callback page have *no* direct test. Given §3.1–3.3, this is the single most valuable suite to add. There is a zarinpal guard harness already built — use it. |
| **Cart store** | Medium | `lib/cart/store.ts` (add/remove/setQuantity/persist hydration) is untested; §3.6 is an obvious bug to codify. |
| **`lib/notifications/*`** | Medium | `order-receipt-text.ts` has a unit test; the SMS/email senders and the receipt orchestrator do not. |
| **Repositories — write paths** | Medium | CRUD suites exist for most entities, but `homepage-features.ts` write helpers and the `casting.ts` helpers have no direct tests. |
| **No E2E** | Medium | No Playwright/agent-browser suite. Given the double-click/idempotency issues in §3.3 the golden path (add to cart → checkout → callback → receipt) deserves one. |
| **Serialized test execution** | Low | `fileParallelism: false` + `maxWorkers: 1` is a deliberate flake fight but makes the suite ~11 minutes and hides ordering bugs rather than fixing them. Consider per-project DB schemas to allow parallelism later. |

### 5.4 Test-infra notes worth acting on

- `tests/helpers/auth-db.ts` at 1,139 lines is a single point of failure for the whole auth tier and is where the 8 failures surface. Split it (§2.2) so a warm-up bug in one helper cannot fail every suite.
- The `fetchPageWhenWarm` retry budget (~3 min) exists because a cold route compile was measured at 62–72 s. That is a cost of `next({ dev: true })`; a one-time production build for the auth tier would be slower to start but far more stable.

---

## 6. Proposed splits (following the `lib/i18n/translations.ts` pattern)

### 6.1 `lib/i18n/translations/admin.ts` — 824 → 11 files

The file is exactly two mirrored halves (`adminEn` at line 1, `adminFa` at line 416), 416 lines each, 336 keys each. Split **by section**, one file per admin surface, each exporting its `en`/`fa` pair:

```
lib/i18n/translations/admin/
  index.ts        # composes adminEn/adminFa from the parts (barrel, like translations/index.ts)
  nav.ts          # admin.nav.*, admin.section.*, admin.breadcrumb.*
  overview.ts     # admin.overview.*, admin.stat.*, admin.card.*, admin.chart.*
  table.ts        # admin.table.*, admin.crud.*, admin.upload.*, admin.role.*
  schema.ts       # admin.error.*
  products.ts     # admin.product.*, admin.productCategory.*
  designers.ts    # admin.designer.*
  collections.ts  # admin.collection.*
  materials.ts    # admin.material.*, admin.fabric.*
  flagships.ts    # admin.flagship.*
  projects.ts     # admin.project.*
  orders.ts       # admin.order.*
  homepage.ts     # admin.homepage.*
  pages.ts        # admin.page.*
  admins.ts       # admin.admins.*, admin.access.*, admin.topbar.*, admin.placeholder.*
  forms.ts        # admin.brand*, admin.header.*, admin.homepage.card.*
```

I verified with a script over all 17 existing modules that **there are zero cross-module key collisions today**, so this split is mechanically safe: the barrel's `...spread` order cannot silently drop a key.

Each file exports `{ adminXEn, adminXFa }` in the existing flat `"admin.foo.bar": "…"` style, so no consumer changes. Pairs stay side by side in one file, which is what keeps en/fa from drifting — the current file already does this at the `adminEn`/`adminFa` level; you are just doing it per section.

This split also *unlocks* §4.1 (a client-safe site dictionary) because it makes the admin/site boundary a directory boundary.

### 6.2 `lib/repositories/homepage-features.ts` — 679 → 7 files

This file is five near-identical triples — `getXFeature` (public read), `getXFeatureAdminDetail`, `updateXFeature` — plus slot constants, five `Resolved*` types, five `*WriteInput` types and one overview aggregator. Every `update*` is the same `upsert({ where: { id: SLOT }, create: { id: SLOT, ...data }, update: data })`.

```
lib/repositories/homepage-features/
  index.ts                  # barrel — re-exports the public API unchanged
  slots.ts                  # the 5 slot id constants, HomepageFeatureSlot, href builders
  resolve.ts                # resolveField, asOptionalLocalizedList (inner helpers)
  flagship-one.ts
  project-banner.ts
  project-dark-background.ts
  home-collection.ts
  catalogue.ts
  overview.ts               # getHomepageFeaturesOverview
```

Also extract the repeated upsert into `slots.ts`:

```ts
export function upsertSingleton<D>(delegate, slotId: string, data: D) { … }
```

The overview function's five sequential `findUnique`s are already `Promise.all`-ed — good — but each includes a relation it does not need (`select: { slug, name }` is right; `catalogueItem` selects title/href correctly). That part is fine.

### 6.3 `lib/repositories/products.ts` — 474 → 4 files

Clean seams by *role*:

```
lib/repositories/products/
  index.ts        # barrel
  include.ts      # productInclude, ProductRow, mapProductRow   (shared by projects.ts & categories)
  reads.ts        # getProduct, getProducts, getProductsByCategory, getProductsByIdsOrSlugs, getProductOptions
  admin.ts        # getProductAdminRows, getProductAdminDetail, *AdminRow/*AdminDetail types
  writes.ts       # ProductWriteInput, createProduct, updateProduct, deleteProduct
```

`projects.ts` (287) exists only to add `projectInclude`, `mapProjectRow` and the same create/update/delete shape. Once `products/writes.ts` exists, extract the shared transaction helper (§7.2) and `projects.ts` shrinks to its genuinely project-specific parts.

### 6.4 `components/signIn/useSignInForm.ts` — 398 → 3 files

The doc comment alone is ~120 lines describing an API table, a request matrix and an error-code map. The implementation is three handlers against one state machine.

```
components/signIn/
  useSignInForm.ts        # the hook: state + wiring only
  auth-error-map.ts       # server code → translation key (the documented table, as code)
  redirect-to.ts          # readRedirectTo() + its security comment
```

The error mapping is written three times inline (`if (code === "INVALID_EMAIL_OR_PASSWORD") … else if … else`) inside the handlers; the doc comment already tabulates it. Turn the table into a real `Record<string, string>` and the three blocks collapse to one lookup. **This also removes a real drift risk** — the comment promises `PHONE_NUMBER_NOT_VERIFIED → invalidOtp` but the phone handler only checks `INVALID_OTP` and `TOO_MANY_ATTEMPTS`.

### 6.5 `components/admin/catalog/fields/ListFields.tsx` — 331 → 3 files

Three independent list-field components with no shared logic beyond the imports they already take from `form.tsx`. One component per file, plus an `index.ts` barrel so existing import sites (`@/components/admin/catalog/fields/ListFields`) keep working:

```
fields/lists/
  index.ts
  StringListField.tsx
  MixedListField.tsx
  LocalizedLabeledRowsField.tsx
```

**A larger win hides inside this file.** All three components re-implement the same four mutations on every row:

```tsx
onRemove  = () => setValues(values.filter((_, i) => i !== index))
onMoveUp  = index > 0 ? () => setValues(swapAt(values, index, -1)) : undefined
onMoveDown= index < values.length - 1 ? () => setValues(swapAt(values, index, 1)) : undefined
onChange  = (v) => setValues(values.map((x, i) => (i === index ? v : x)))
```

Promote these into `useList` (in `form.tsx`) as `itemProps(index)`, or add `useListRow(index)`. That deletes roughly 60 lines of near-identical closure code across the three components and makes the row-mutation contract testable in one place.

### 6.6 `components/admin/ImageUpload.tsx` — 279 → 2 files

Exports two unrelated components (`ImageUpload` and `ImageListField`) plus a private `errorAtPath` helper. Split into `ImageUpload.tsx`, `ImageListField.tsx`, and move `errorAtPath` to `fields/form.tsx` — it duplicates what `useFieldMessage` already does for flat paths, and `form.tsx` is where the kit's error resolution belongs.

### 6.7 The 250–330 line admin forms/tables

`ProductForm.tsx` (327), `FlagshipForm.tsx` (308), `ProjectForm.tsx` (247), `CollectionForm.tsx` (197) all follow one shape: `<FormCard>` blocks over a `FormProvider`. They are already composed of kit components; the split that pays is **one file per card section** in a sibling folder, e.g.:

```
catalog/products/ProductForm/
  index.tsx
  IdentityCard.tsx
  PricingCard.tsx
  MediaCard.tsx
  ContentCard.tsx
  ExtrasCard.tsx
  DangerCard.tsx
```

`ProductForm.tsx` even carries an `{/* EXTRAS_BLOCK */}` marker comment where sections have obviously been moved around. This is lower priority than §6.1–6.5 — the forms read fine and the LOC is mostly JSX, not logic.

The `*Table.tsx` files (AdminsTable 315, DesignersTable 289, ProductCategoriesTable 266, CatalogueTable 257, MaterialsTable 245, FabricsTable 238) all build a `ColumnDef[]` inline plus a dialog form. The correct fix is not to split them but to **extract the shared column set** (§7.1) — most of their length is repeated `localizedColumn`/`slugColumn`/`imageColumn`/`actionsColumn` calls with different labels, which the `columns.tsx` factories already handle. What remains per file is genuinely entity-specific.

---

## 7. Duplication

### 7.1 Two DataTable implementations

| | `components/admin/data-table/DataTable.tsx` (164) | `components/admin/dashboard/data-table.tsx` (376) |
|---|---|---|
| Used by | **11 tables** (all catalog sections) | **1 page** (`admin/page.tsx`) |
| API | `ColumnDef[]`, generic, `toolbar` slot, sorting + pagination | `createColumnHelper`, hardcoded `DashboardProductRow` |
| i18n | caller-supplied labels via factories in `columns.tsx` | builds columns inside the component from `useLanguage()` |
| Perks | — | column-visibility dropdown, rows-per-page select |
| Drawbacks | no column visibility | single-use, non-reusable, 376 lines for one table |

`columns.tsx` (177 lines) is the good abstraction — `localizedColumn`, `textColumn`, `slugColumn`, `numberColumn`, `imageColumn`, `updatedColumn`, `actionsColumn`, `formatAdminNumber`. The dashboard's table predates it.

**Fix:** replace `dashboard/data-table.tsx` with the shared `DataTable` + a `dashboard/columns.tsx` built from the same factories, porting the column-visibility dropdown into the shared `DataTable` as an opt-in prop. This deletes ~376 lines and removes a second place where "how an admin table works" is defined — the exact divergence that makes two tables in the same dashboard look different.

### 7.2 Transaction boilerplate ×4

`products.ts` and `projects.ts` each contain both variants:

```ts
const run = async (tx: Prisma.TransactionClient) => { … };
// variant A (create)
const row = db === prisma ? await prisma.$transaction(run) : await run(db);
// variant B (update/delete)
if (db === prisma) { await prisma.$transaction(run); } else { await run(db); }
```

**Fix:** one helper in `lib/db/prisma.ts`:

```ts
export async function withTransaction<T>(
  db: Prisma.TransactionClient,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db === prisma ? prisma.$transaction(run) : run(db);
}
```

Then every write becomes `return withTransaction(db, run)`. This also removes the `db === prisma` reference comparison, which is fragile if a proxy ever wraps `prisma`.

### 7.3 Locale-ternary formatting ×6

```
components/admin/catalog/columns.tsx:97    new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US")
components/admin/catalog/columns.tsx:159   new Intl.DateTimeFormat(args.lang === "fa" ? "fa-IR" : "en-US", …)
components/admin/dashboard/data-table.tsx:157
components/admin/dashboard/chart-area-interactive.tsx:61
components/admin/dashboard/section-cards.tsx:81
app/[locale]/(site)/checkout/callback/page.tsx:223  new Intl.NumberFormat("en-US")
```

…while `lib/i18n/price.ts` already owns the same convention (`fa-IR` vs `de-DE`) and `columns.tsx` already exports `formatAdminNumber`. Note the inconsistency: admin uses `en-US`, price uses `de-DE` for the same "English" locale.

**Fix:** move `formatAdminNumber` and a new `formatAdminDate` into a shared `lib/i18n/format.ts` (or into `price.ts`, renamed `number.ts`), export a `localeTag(locale)` helper, and make every site call it. `lib/i18n/price.ts:52,64` also constructs a new `Intl.NumberFormat` on every call — module-level cached instances are the standard fix.

### 7.4 Locale-aware path building ×2 conventions

`getLocalizedPath()` in `lib/i18n/routing.ts` is the sanctioned way to build a URL, and `lib/i18n/Link.tsx` applies it automatically. But ~10 components hand-build hrefs as template strings:

```
components/products/prod/RelatedProdSection.tsx:67   href={`/products/${item.category}/${item.slug}`}
components/search/SearchResults.tsx:288              href={`/products/${p.category}/${p.slug}`}
components/search/SearchResults.tsx:308              href={`/designers/${d.slug}`}
components/ui/ProductsSheet.tsx:138,183              href={`/products/${categoryLink[i]}`}
components/collections/collection/ProductsInCollectionSection.tsx:218
components/products/ProductCategoryCard.tsx:43-44
lib/repositories/slug-history.ts:163                 `/products/${encodeURIComponent(…)}/${encodeURIComponent(…)}`
lib/repositories/homepage-features.ts:59,64          `/flagship/${slug}`, `/projects/${slug}`
lib/repositories/products.ts:76                      `/designers/${row.designer.slug}`
```

Because these are raw strings and consumers render them through `LocaleLink`, the prefixing works — but every one of them is a place where the route shape can drift from the `app/` tree, and note that **the repository layer builds routes at all**, which is a layering leak (repositories should return data, not URLs). `homepage-features.ts` is the worst offender: it returns `ctaHref` as a *resolved* field.

**Fix:** a single `lib/routes.ts`:

```ts
export const routes = {
  product:        (category: string, slug: string) => `/products/${category}/${slug}`,
  productCategory:(slug: string) => `/products/${slug}`,
  designer:       (slug: string) => `/designers/${slug}`,
  flagship:       (slug: string) => `/flagship/${slug}`,
  project:        (slug: string) => `/projects/${slug}`,
  collection:     (slug: string) => `/collections/${slug}`,
  collections:    () => "/collections",
};
```

Both the components and the repositories call it. This is a two-hour change that makes every future route rename a one-line edit.

### 7.5 Casting helpers are unchecked

`lib/repositories/casting.ts` is 91 lines of `value as T`. That is a deliberate and documented choice, and the *shape* is fine — but `asLocalized` will happily return `null as Localized` if a nullable column leaks through, and 91 call sites depend on it. **Fix:** make the nullable cases fail loudly in development:

```ts
export function asLocalized(value: unknown): Localized {
  if (value == null) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error("asLocalized: expected {en,fa}, got null — use asOptionalLocalized");
    }
  }
  return value as Localized;
}
```

This is cheap, zero-cost in production, and would have caught the `moreInfo`/`detail` null-vs-undefined normalization that `ProductForm` and `DesignersTable` each special-case by hand (§7.6).

### 7.6 Null-vs-undefined normalization repeated at call sites

Both `ProductForm.tsx:68` and `DesignersTable.tsx` contain the same workaround:

```ts
// "The server detail maps SQL NULL to `undefined`; the schema needs `Localized | null`"
moreInfo: detail.moreInfo ?? null,
```

This is a symptom of `asOptionalLocalized` returning `undefined` where the schemas want `null`. Standardize on the repository returning `T | null` for nullable jsonb (matching the DB) and delete the per-form patches.

### 7.7 Smaller duplicates

- `errorAtPath` (`ImageUpload.tsx:40`) duplicates `useFieldMessage`'s job for nested paths — merge into `form.tsx`.
- `useMediaQuery` is defined privately in `components/ui/ProductsSheet.tsx:23` and is a generic hook that belongs in `lib/hooks/` (which currently holds only `useDebouncedValue.ts`).
- `swapAt` lives in `fields/form.tsx` and is correctly shared — good. Contrast with the four inlined `values.filter((_, i) => i !== index)` copies in `ListFields.tsx` (§6.5).
- `formatOrderAmount` (`checkout/callback/page.tsx:212`) re-implements `formatToman`/`formatEur` — see §3.5.
- The `resolved` table triple (`User.phoneNumber` vs `Order.phone` vs synthetic email) is documented in the project log; the receipt policy in `order-receipt-text.ts` is the single owner — good, no duplication there.

---

## 8. Suggested next steps

1. **Fix §3.1 (stock decrement) and §3.4 (`SmoothScroll` ticker) now.** Both are small, both are unambiguous, and the first is a live business defect.
2. **Add a checkout/payment test suite** before touching §3.2/3.3, so the fixes are guarded. The `zarinpal-guard` harness already exists.
3. **Do §4.1 and §4.2.** Together they are the largest user-visible win (bundle size + per-request query cost) and neither requires a schema change. §4.1 depends on §6.1, so do that split first — it is mechanical and script-verifiable.
4. **Do §7.1 (delete the dashboard DataTable)** — pure deletion, ~376 lines gone, one fewer concept in the codebase.
5. **Introduce `lib/routes.ts` (§7.4) and `withTransaction` (§7.2)** while the surface is small.
6. Defer the §6.2/6.3/6.4 repository and hook splits until after the perf work lands, then treat them as isolated PRs — each has a barrel-friendly seam and no consumer churn.

### Known non-issues (verified, no action)

- No cross-module duplicate translation keys — verified programmatically across all 17 modules.
- No tracked file is shadowed by `.gitignore` rules.
- Admin upload validation is content-based (`lib/admin/image-sniff.ts` reads magic bytes), not MIME-claim-based — correct.
- Admin authorization is re-run server-side on every action, with `proxy.ts` as an edge gate and the React tree as a backstop — correct, and tested.
- `tsc --noEmit` is clean.
