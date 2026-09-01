# Translate ProductsSheet & Hide Logo in FA Mode

## Goal
1. Add ProductsSheet navbar trigger texts ("products"/"close") and category labels to the translation system.
2. Replace the Latin-script logo text `HOME FORM` with Persian `هوم فرم` when the active language is Persian (`fa`).
3. Make the ProductsSheet open from the **left** side in Persian (RTL) mode instead of always from the right.

## Context
- `components/ui/ProductsSheet.tsx` has hardcoded strings: `"products"`, `"close"`, `"all Products"`, `"LIGHTING"`, `"DESIGNERS"`, plus dynamic category names from `lib/data/productCategories.ts`.
- Existing translation keys already cover `nav.products`, `nav.close`, and `nav.allProducts`.
- `components/ui/Logo.tsx` renders an inline SVG with Latin text `"HOME FORM"`. It is used in `Navbar`, `Footer`, and `Preloader`.
- `Preloader` is rendered **outside** `LanguageProvider` in `app/layout.tsx`, so it currently cannot access `useLanguage()`.
- `ProductsSheet` currently hardcodes `side="right"` on desktop and animates `x: 400`. For RTL it should use `side="left"` and animate `x: -400`.

## Plan

### 1. Add translation keys to `lib/i18n/translations.ts`
Add `products.*` keys to both `en` and `fa` dictionaries:
- `products.lighting` / `products.designers`
- One key per `productCategories` entry, keyed by `slug` (e.g. `products.bookcases`, `products.cabinetsAndSideboards`, `products.tables`, `products.coffeeTables`, `products.sofasAndArmchairs`, `products.chairsAndStools`, `products.kitchens`, `products.bedroom`, `products.wallPanelling`, `products.accessories`)
- Add `logo.text` key: `HOME FORM` in `en`, `هوم فرم` in `fa`.

### 2. Update `components/ui/ProductsSheet.tsx`
- Import `useLanguage`.
- Determine the `side` and animation direction based on `lang`:
  - `side`: `isMobile ? "top" : lang === "fa" ? "left" : "right"`
  - `motionProps.initial.x`: `isMobile ? 0 : lang === "fa" ? -400 : 400`
  - `motionProps.exit.x`: `isMobile ? 0 : lang === "fa" ? -400 : 400`
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
- Use `t("logo.text")` inside the SVG `<text>` element so it renders `HOME FORM` in `en` and `هوم فرم` in `fa`.

### 4. Update `app/layout.tsx`
- Move `<Preloader />` inside `<LanguageProvider>` so the Logo component can safely consume `useLanguage()` without throwing.

### 5. Validation
- Run `npm run build` to verify no TypeScript or build errors.
