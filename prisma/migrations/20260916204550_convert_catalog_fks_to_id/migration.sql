-- ===========================================================================
-- Migration: convert_catalog_fks_to_id
--
-- Converts all catalog foreign keys from slug-based references to id-based
-- references. For all seeded data, id == slug (verified against the dev DB
-- before this migration ran), so the column *values* do not change — only the
-- FK constraint target switches from parent.slug to parent.id.
--
-- This is an additive-then-drop migration:
--   1. Drop old slug-referencing FK constraints (column data is preserved).
--   2. Backfill: normalize any drifted FK values via a slug->id join.
--   3. Add new id-referencing FK constraints (the ADD CONSTRAINT step itself
--      double-checks referential integrity — it fails if any orphan remains).
--
-- Row-count safety: every statement below is DROP-constraint / UPDATE /
-- ADD-constraint. No DELETE or DROP COLUMN runs, so zero rows can be
-- silently lost. The FK constraints added in step 3 enforce that every FK
-- value references a valid parent row.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop old slug-referencing FK constraints (columns & values preserved).
-- ---------------------------------------------------------------------------
-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_designerId_fkey";

-- DropForeignKey
ALTER TABLE "product_image" DROP CONSTRAINT "product_image_productId_fkey";

-- DropForeignKey
ALTER TABLE "project_product" DROP CONSTRAINT "project_product_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_product" DROP CONSTRAINT "project_product_productId_fkey";

-- ---------------------------------------------------------------------------
-- 2. Backfill: normalize FK column values from slug to id.
--
-- Each UPDATE joins the child FK column to the parent's slug and, where the
-- child value (a slug) differs from the matching parent id, sets it to the
-- parent id. For the current seed, id == slug everywhere, so zero rows are
-- affected — but the guard protects against any drift. Rows whose FK value
-- matches no parent slug are left untouched (they would fail the FK
-- constraint added in step 3 anyway).
-- ---------------------------------------------------------------------------

-- Product.categoryId -> ProductCategory.id (via category slug)
UPDATE "product" AS p
SET "categoryId" = pc.id
FROM "product_category" AS pc
WHERE p."categoryId" = pc.slug AND p."categoryId" != pc.id;

-- Product.designerId -> Designer.id (via designer slug); skip NULLs.
UPDATE "product" AS p
SET "designerId" = d.id
FROM "designer" AS d
WHERE p."designerId" = d.slug AND p."designerId" != d.id;

-- ProductImage.productId -> Product.id (via product slug)
UPDATE "product_image" AS pi
SET "productId" = p.id
FROM "product" AS p
WHERE pi."productId" = p.slug AND pi."productId" != p.id;

-- ProjectProduct.projectId -> Project.id (via project slug)
UPDATE "project_product" AS pp
SET "projectId" = pj.id
FROM "project" AS pj
WHERE pp."projectId" = pj.slug AND pp."projectId" != pj.id;

-- ProjectProduct.productId -> Product.id (via product slug)
UPDATE "project_product" AS pp
SET "productId" = p.id
FROM "product" AS p
WHERE pp."productId" = p.slug AND pp."productId" != p.id;

-- ---------------------------------------------------------------------------
-- 3. Create SlugHistory table (slug-rename redirect support, Step 7 prep).
-- ---------------------------------------------------------------------------
-- CreateTable
CREATE TABLE "slug_history" (
    "id" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slug_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slug_history_entityId_idx" ON "slug_history"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "slug_history_modelType_oldSlug_key" ON "slug_history"("modelType", "oldSlug");

-- ---------------------------------------------------------------------------
-- 4. Add new id-referencing FK constraints.
--    If any FK value is orphaned (no matching parent id), ADD CONSTRAINT
--    fails — this is the referential-integrity guarantee.
-- ---------------------------------------------------------------------------
-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "designer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_product" ADD CONSTRAINT "project_product_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_product" ADD CONSTRAINT "project_product_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
