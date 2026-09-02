# Plan: Localize `ProductsSheet.tsx` into the i18n system

## Goal
Extract all hardcoded English text from `components/ui/ProductsSheet.tsx` so it is driven by the existing translation system (`lib/i18n`) and renders correctly in both `en` and `fa`.

## Context
- Translation system: `lib/i18n/LanguageProvider.tsx` exposes `useLanguage()` with `t(key)`, `lang`, `dir`. Keys live in `lib/i18n/translations.ts` (typed via `TranslationKey = keyof typeof translations.en`).
- Components consume it with `const { t } = useLanguage();` then `t("key")`. See `components/navbar/menuColumn.tsx:27` and `components/navbar/Navbar.tsx:20`.
- `products.*` keys already exist in `translations.ts` for category names (e.g. `products.lighting`, `products.designers`, `products.bookcases`, ... `products.accessories`) but are currently UNUSED. The `fa` values are already translated.
- Data convention: `lib/data/menu.ts` carries an `i18nKey` field per entry (see `components/header/data.ts`). `productCategories` does not yet have one.

## Decisions
1. Reuse existing `products.*` keys for category labels (no new category keys needed).
2. Add a new `productsSheet.*` namespace for the component-only UI strings: the trigger toggle ("products"/"close") and the "all Products" link. `fa` values mirror existing `nav.products`/`nav.close`/`menu.allProducts` translations.
3. Add `i18nKey: string` to the `ProductCategory` interface + all 11 entries in `lib/data/productCategories.ts`, mapping each to its existing `products.*` key (follows `menu.ts` precedent). Additive + non-breaking for all current readers (they only read `slug`/`name`/`subCategories`).
4. Keep the pre-existing "LIGHTING" duplicate (it is duplicated because `productCategories[0]` is `lighting` and the array also hardcodes `products.lighting` first). Behavior preserved; flagged as a pre-existing issue, not fixed in this task.

## Tasks

### 1. `lib/i18n/translations.ts` — add `productsSheet.*` keys
Insert a `productsSheet` block into both `en` and `fa` objects (place after the `products.*` block, ~line 99 / ~line 213):

en:
```ts
"productsSheet.products": "products",
"productsSheet.close": "close",
"productsSheet.allProducts": "all Products",
```
fa:
```ts
"productsSheet.products": "محصولات",
"productsSheet.close": "بستن",
"productsSheet.allProducts": "همه محصولات",
```

### 2. `lib/data/productCategories.ts` — add `i18nKey`
- Add `i18nKey: string;` to the `ProductCategory` interface.
- Add an `i18nKey` to each of the 11 category entries, mapping slug → key:

| slug | i18nKey |
|---|---|
| lighting | products.lighting |
| bookcases | products.bookcases |
| cabinets-and-sideboards | products.cabinetsAndSideboards |
| tables | products.tables |
| coffee-tables | products.coffeeTables |
| sofas-and-armchairs | products.sofasAndArmchairs |
| chairs-and-stools | products.chairsAndStools |
| kitchens | products.kitchens |
| bedroom | products.bedroom |
| wall-panelling | products.wallPanelling |
| accessories | products.accessories |

### 3. `components/ui/ProductsSheet.tsx` — use `t()`
- Add import: `import { useLanguage } from "@/lib/i18n/LanguageProvider";`
- In component body: `const { t } = useLanguage();`
- Replace the module-level `categories` constant (hardcoded display strings) with an array of translation keys:
```ts
const categoryKeys = [
  "products.lighting",
  "products.designers",
  ...productCategories.map((c) => c.i18nKey),
];
```
- Trigger labels: `products` → `{t("productsSheet.products")}`, `close` → `{t("productsSheet.close")}`.
- "all Products" link (desktop + mobile): `{t("productsSheet.allProducts")}`.
- Both `<nav>` render loops: iterate `categoryKeys` and render `{t(key)}`:
```tsx
{categoryKeys.map((key) => (
  <Link
    key={key}
    href="#"
    onClick={(e) => {
      e.preventDefault();
      closeSheet();
    }}
    className={`${linkClasses} group relative`}
  >
    {t(key)}
    <UnderLineEffect />
  </Link>
))}
```

## Out of scope (not changed)
- `ProductSubCategory.name` is not localized here (only categories are used by this sheet). Sub-category names could be localized later via the same `i18nKey` pattern if a sheet/subcategory view needs it.
- The Sheet primitive API (`actionsRef`, `eventDetails.preventUnmountOnClose`) targets Radix-style props while `components/ui/sheet.tsx` is Base UI. Pre-existing; not touched by this task.

## Validation
- `pnpm lint` (script is `eslint`).
- `npx tsc --noEmit` to confirm typing (incl. `TranslationKey` and `ProductCategory.i18nKey`).
- Visual check in browser: EN shows "products"/"close" toggle, "all Products", and uppercased category labels identical to before; FA shows "محصولات"/"بستن", "همه محصولات", and Persian category labels.
- Ensure no other consumer of `productCategories` breaks (read-only consumers: `app/products/[product]/page.tsx`, `components/products/ProductsGrid.tsx`, `components/collections/.../ProductsInCollectionSection.tsx`).
