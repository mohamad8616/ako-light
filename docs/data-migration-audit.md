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
   - Fields: id, productId (FK to Product.id — converted from Product.slug in Pass 11C, §3c), url, alt, sortOrder, isPrimary, timestamps
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
- **PROPOSED SCOPE CHANGE — CONFIRMED AND IMPLEMENTED in Pass 11C (§3c):**
  migrate all catalog FKs from slug-based to id-based (`ProductImage`,
  `ProjectProduct`, `Product.categoryId/designerId`). Slugs can change while
  ids shouldn't, so the id-based FKs are more correct — but it was a
  schema-wide convention change and had to be a dedicated, confirmed pass.

## 3c. Pass 11C — Catalog FKs converted to `id` (+ slug-rename redirects)

Date: 2026-09-17. Confirms and implements the scope change §3b proposed and
left pending. It is the precondition for Step 7 admin CRUD: once slugs are
editable from the dashboard they can no longer be load-bearing for relational
integrity.

### Foreign keys converted (slug → id)

Every foreign key in the schema followed the slug-reference convention, so all
five were converted — the list below is the complete set, not a subset. The
Better Auth tables needed no change: `Session.userId` and `Account.userId`
already referenced `User.id`.

| Child FK column | Was → | Now → |
| --- | --- | --- |
| `Product.categoryId` | `ProductCategory.slug` | `ProductCategory.id` |
| `Product.designerId` | `Designer.slug` | `Designer.id` |
| `ProductImage.productId` | `Product.slug` | `Product.id` |
| `ProjectProduct.projectId` | `Project.slug` | `Project.id` |
| `ProjectProduct.productId` | `Product.slug` | `Product.id` |

`slug` is still `@unique` on `ProductCategory`, `Designer`, `Product`,
`Collection`, `Material`, `Flagship` and `Project`, and is still the
routing/`getBySlug` handle — it is simply never a foreign-key target any more.

### Migrations

1. `20260916204550_convert_catalog_fks_to_id` — drops the five slug-targeting
   FK constraints, backfills each FK column from the parent's `slug` to its
   `id`, creates `slug_history`, then adds the id-targeting constraints. There
   is no `DELETE` and no `DROP COLUMN` anywhere: the `ADD CONSTRAINT` step is
   the integrity gate, and it fails the whole migration if even one orphan
   value remains.
2. `20260916220000_catalog_fk_additive_column_swap` — the strictly additive
   form of the same swap (`*_new_id` column → backfill via the constraint's
   *actual* target → validate → `SET NOT NULL` → add FK → drop the old column →
   rename), added because migration 1 had already been applied in dev. It
   asserts row counts before/after inside the migration itself and raises if
   they differ, then restores the indexes and the `project_product` composite
   primary key that the column drop removed.

Both are applied: `npx prisma migrate status` reports the database up to date.

### Row-count verification (no rows were dropped)

The seed was **not** re-run: the counts below are the post-migration database
counts, and `tests/integration/schema.test.ts` now asserts each one to be
*exactly* the number derived from the static `lib/data` sources — a `> 0` check
could not catch a silently dropped row.

| Table | Rows |
| --- | --- |
| `product_category` | 11 |
| `designer` | 9 |
| `product` | 31 |
| `product_image` | 186 |
| `collection` | 6 |
| `material` | 4 |
| `flagship` | 12 |
| `project` | 4 |
| `project_product` | 12 |

Orphans across all five converted FKs: **0**. `id = slug` holds for all 77 rows
across the seven slugged models (11+9+31+6+4+12+4), verified *before* relying on
it, so the backfill had no drifted values to repair. `slug_history` holds 0 rows
(nothing has been renamed yet — admin CRUD does not exist).

### Code changes

- `prisma/schema.prisma` — the five `references: [slug]` → `references: [id]`,
  the rewritten FK-convention header note, and the new `SlugHistory` model.
- `prisma/seed.ts` — now resolves every parent *slug* from the static data to
  the parent's *id* before writing an FK column (`categoryIdsBySlug`,
  `designerIdsBySlug`, `productIdsBySlug`), and keys `ProductImage` rows on
  `product.id` instead of `product.slug`. Previously the seed wrote slugs into
  the FK columns, which worked only because `id == slug` for placeholder data —
  exactly the assumption Step 7 removes.
- `lib/repositories/products.ts` — `mapProductRow()` derives `category` from
  the joined relation's `slug` (the FK column no longer *is* a slug);
  `getProduct()` compares `row.category.slug`; `getProductsByCategory()`
  resolves the route slug to `ProductCategory.id` and queries the relation by
  id.
- `lib/repositories/product-images.ts` — `getProductImages()` and
  `getProductPrimaryImage()` take the product's `id` (parameter renamed from
  `productSlug`).
- `lib/repositories/slug-history.ts` (new) — `recordSlugChange(modelType,
  entityId, oldSlug, db?)` for Step 7's update mutations, plus
  `getCatalogRedirectPath()` / `getCatalogPathRedirect()`.
- `lib/navigation/slugRedirect.ts` (new) — `redirectIfSlugRenamed()`, the thin
  route-level wrapper that keeps `next/navigation` out of the repository layer.
- The seven dynamic catalog `page.tsx` files (products category, product
  detail, collections, designers, materials, flagship, projects) call it from
  **both** `generateMetadata` and the page body before `notFound()` — if only
  the page body called it, `generateMetadata`'s own `notFound()` would win and
  the redirect would never be served.
- `app/[locale]/products/[product]/[prod]/page.tsx` — the ProductImage lookups
  now pass `productt.id`.

### Redirect status code: 308, not 301

The App Router cannot emit a 301: `redirect()` serves 307 and
`permanentRedirect()` serves **308 (Permanent)**. These routes use
`permanentRedirect()`; 308 is a permanent, method-preserving redirect and the
correct equivalent for a renamed public URL. A literal 301 would require
`next.config.js` redirects or the Proxy — `getCatalogPathRedirect()` in
`lib/repositories/slug-history.ts` is the ready-made Proxy entry point if that
is ever wanted.

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
- `product_image` — ProductImage model (FK moved from `Product.slug` to `Product.id` in Pass 11C, §3c)

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