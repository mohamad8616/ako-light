# Translate ProductsSheet & Hide Logo in FA Mode

## Goal
1. Add ProductsSheet navbar trigger texts ("products"/"close") and category labels to the translation system.
2. Hide the Latin-script logo when the active language is Persian (`fa`).

## Context
- `components/ui/ProductsSheet.tsx` has hardcoded strings: `"products"`, `"close"`, `"all Products"`, `"LIGHTING"`, `"DESIGNERS"`, plus dynamic category names from `lib/data/productCategories.ts`.
- Existing translation keys already cover `nav.products`, `nav.close`, and `nav.allProducts`.
- `components/ui/Logo.tsx` renders an inline SVG with Latin text `"HOME FORM"`. It is used in `Navbar`, `Footer`, and `Preloader`.
- `Preloader` is rendered **outside** `LanguageProvider` in `app/layout.tsx`, so it currently cannot access `useLanguage()`.

## Plan

### 1. Add translation keys to `lib/i18n/translations.ts`
Add `products.*` keys to both `en` and `fa` dictionaries:
- `products.lighting` / `products.designers`
- One key per `productCategories` entry, keyed by `slug` (e.g. `products.bookcases`, `products.cabinetsAndSideboards`, `products.tables`, `products.coffeeTables`, `products.sofasAndArmchairs`, `products.chairsAndStools`, `products.kitchens`, `products.bedroom`, `products.wallPanelling`, `products.accessories`)

### 2. Update `components/ui/ProductsSheet.tsx`
- Import `useLanguage`.
- Replace hardcoded strings with `t()`:
  - `"products"` → `t("nav.products")`
  - `"close"` → `t("nav.close")`
  - `"all Products"` → `t("nav.allProducts")`
  - `"LIGHTING"` → `t("products.lighting")`
  - `"DESIGNERS"` → `t("products.designers")`
  - `c.name.toUpperCase()` → `t("products." + c.slug)`

### 3. Update `components/ui/Logo.tsx`
- Add `"use client"`.
- Import `useLanguage`.
- Return `null` when `lang === "fa"`.

### 4. Update `app/layout.tsx`
- Move `<Preloader />` inside `<LanguageProvider>` so the Logo component can safely consume `useLanguage()` without throwing.

### 5. Validation
- Run `npm run build` to verify no TypeScript or build errors.
