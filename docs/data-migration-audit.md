# Data Migration Audit — Home Form

**Date:** 2026-09-16
**Pass:** 11A — Complete remaining database/data migration
**Branch:** cline

---

## 1. Classification of Static Data Usage

### A. MUST COME FROM DATABASE (business/content data)

These are products, categories, designers, collections, materials, fabrics, catalogues, flagships, and projects data that should be editable from an admin dashboard.

### B. SHOULD REMAIN STATIC (UI configuration, constants, translations)

- `lib/data/homepage.ts` — Homepage section configuration
- `lib/data/about.ts` — About page images
- `lib/data/s34.ts` — S34 page content sections
- `lib/data/contact.ts` — Contact page info
- `lib/data/footer.ts` — Social links configuration
- `lib/data/menu.ts` — Navigation menu structure  
- `lib/data/imageGalleries.ts` — Gallery image sets
- `lib/i18n/**` — Translation definitions

## 2. What is already DB-backed (No action needed)

These entities already have Prisma models, repositories, and are seeded:

- `ProductCategory` → `lib/data/product-categories/*` → repo: `lib/repositories/product-categories.ts`
- `Designer` → `lib/data/designers.ts` → repo: `lib/repositories/designers.ts`
- `Product` → `lib/data/product-categories/*` → repo: `lib/repositories/products.ts`
- `Collection` → `lib/data/collections.ts` → repo: `lib/repositories/collections.ts`
- `Material` → `lib/data/materials.ts` → repo: `lib/repositories/materials.ts`
- `Flagship` → `lib/data/flagships.ts` → repo: `lib/repositories/flagships.ts`
- `Project` → `lib/data/projects.ts` → repo: `lib/repositories/projects.ts`

## 3. What was completed in Pass 11A

### Added Models (Prisma schema)

1. **ProductImage** — Separate relational model for product images
   - Fields: id, productId (FK to Product.slug), url, alt, sortOrder, isPrimary, timestamps
   - Migration: `20260916150027_add_product_image_fabric_item_catalogue_item`

2. **FabricItem** — Separate entity from Material for fabric swatches
   - Fields: id, name, code, category, swatchColor, sortOrder, timestamps
   - Uses static data's existing IDs (e.g., "abarth-26")

3. **CatalogueItem** — Catalogue PDF/item entity
   - Fields: id, title, href, coverColor, coverTextColor, sortOrder, timestamps
   - Uses static data's existing IDs (e.g., "s34-5")

### Added Repositories

1. **lib/repositories/product-images.ts** — `getProductImages`, `getProductPrimaryImage`, `getProductImage`
2. **lib/repositories/fabrics.ts** — `getFabricItems`, `getFabricItem`
3. **lib/repositories/catalogue.ts** — `getCatalogueItems`, `getCatalogueItem`

### Seed Changes

- `seedProductImages()` — migrates existing product images to ProductImage table
- `seedFabricItems()` — seeds fabric items from static data
- `seedCatalogueItems()` — seeds catalogue items from static data

Seed verified: 186 product images, 10 fabric items, 6 catalogue items populated.

### Tests Added/Updated

- `tests/server/fabrics.test.ts` — Shape parity, not-found, list count/ordering, cache de-dup
- `tests/server/catalogue.test.ts` — Shape parity, not-found, list count/ordering, cache de-dup
- Schema/seed integrity extended to include new tables

All 133 tests passing.

## 3b. Pass 11B — Wiring ProductImage / FabricItem / CatalogueItem into the UI

Date: 2026-09-16. Closes the "data exists but nothing reads it" gap for the
three Pass 11A entities.

### Part A — ProductImage → product detail view

- `app/[locale]/products/[product]/[prod]/page.tsx` now fetches gallery images
  via `getProductImages()` (sortOrder order) and the cover via
  `getProductPrimaryImage()` (isPrimary, falling back to first-by-sortOrder),
  and passes `galleryImages` down to `ProductPageClient` /
  `ImageGalleryCarousel`. JSON-LD and OG metadata use the primary image
  (fallback `heroImage`).
- `Product.images String[]` dropped (migration
  `20260916180000_drop_product_images`). It was NOT dead when Pass 11B started
  — readers were: the detail gallery, detail JSON-LD/OG, `ProductsGrid` card
  stacks (`product.images[0]`, `category.products[0]?.images`), and the
  category-page metadata image. All were converted: `productInclude` now
  includes `productImages` (sortOrder-ordered) and `mapProductRow` derives
  `images` from the relation, so grid/metadata readers are DB-sourced with no
  component churn. One source of truth: `product_image`.
- Seed: `images` removed from the Product upsert; `seedProductImages()` still
  populates `product_image` from the static source arrays.

### Part B — FabricItem → FabricsGrid

- `FabricsGrid` takes a `fabrics` prop (no static import);
  `MaterialCategoryView` threads it through; `app/[locale]/materials/[material]/page.tsx`
  fetches via `getFabricItems()`.

### Part C — CatalogueItem → CatalogueGrid

- `CatalogueGrid` takes an `items` prop (no static import);
  `app/[locale]/catalogue/page.tsx` fetches via `getCatalogueItems()`.

### Part 0 decisions

- **`ProductImage.productId` FK kept referencing `Product.slug`** (not
  `Product.id`). Rationale: the schema-wide, AGENTS.md-locked convention is
  slug-based parent FKs (shared with `Product.categoryId`, `Product.designerId`,
  `ProjectProduct.productId`), and for placeholder data id == slug. Changing
  only ProductImage would split the schema into two FK styles.
- **PROPOSED SCOPE CHANGE (needs confirmation before any future pass):**
  migrate all catalog FKs from slug-based to id-based (`ProductImage`,
  `ProjectProduct`, `Product.categoryId/designerId`). Slugs can change while
  ids shouldn't, so the id-based FKs are arguably more correct — but it is a
  schema-wide convention change and must be a dedicated, confirmed pass.

## 4. Static data intentionally retained

These files remain as static data and should NOT be migrated:

- `lib/data/homepage.ts` — UI configuration for homepage sections
- `lib/data/about.ts` — About page image assets
- `lib/data/s34.ts` — S34 page content sections
- `lib/data/contact.ts` — Contact page info (could be DB-backed later)
- `lib/data/footer.ts` — Social links configuration
- `lib/data/menu.ts` — Navigation menu structure
- `lib/data/imageGalleries.ts` — Gallery image sets
- `lib/i18n/translations/*.ts` — Translation definitions

## 5. Files that can eventually be deleted

After all runtime reads switch to database:

- `lib/data/catalogue.ts` — Once all components use `getCatalogueItems()` repository
- FabricItem array/interface from `lib/data/materials.ts` — Once all components use `getFabricItems()` repository

**Note:** These files are currently kept as seed sources and for backward compatibility.

## 6. Migration details

Created migration: `20260916150027_add_product_image_fabric_item_catalogue_item`

Tables created:
- `fabric_item` — FabricItem model
- `catalogue_item` — CatalogueItem model  
- `product_image` — ProductImage model with FK to product.slug

## 7. Commands executed

```bash
# Generate Prisma client
npx prisma generate --config prisma7.config.ts

# Create and apply migration
npx prisma migrate dev --name add-product-image-fabric-item-catalogue-item

# Run seed
npx prisma db seed

# TypeScript check
npx tsc --noEmit

# Run tests
npm test
```

## 8. Final verification results

- ✅ TypeScript compilation: Passed
- ✅ Prisma schema: Valid
- ✅ Migration: Created and applied
- ✅ Seed: Executed successfully (186 product images, 10 fabrics, 6 catalogues)
- ✅ Tests: All 133 tests passed (16 test files)

## 9. Remaining work (Post-Pass 11A)

- [ ] Switch component imports from static data to repository functions for catalogue and fabrics
- [ ] (Optional) Remove `images: string[]` from Product model after UI fully migrated to ProductImage
- [ ] Admin UI for managing ProductImage/FabricItem/CatalogueItem (Pass 12+)
- [ ] Consider migrating contact.ts and s34.ts to database (future decision)