-- Expand the materials catalog into managed groups and display-only items.
-- The old fabric_item table is intentionally retained as a recovery source.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "material"
    WHERE NULLIF(BTRIM("category"), '') IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM "fabric_item"
    WHERE NULLIF(BTRIM("category"), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate materials: a material/fabric row has a blank category. Review the source rows and assign a category before retrying.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "fabric_item" f
    JOIN "material" m ON m."id" = f."id" OR m."slug" = f."id"
  ) THEN
    RAISE EXCEPTION 'Cannot migrate fabrics: a FabricItem id conflicts with an existing Material id/slug. Resolve the collision before retrying.';
  END IF;
END $$;

CREATE TABLE "material_category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "material_category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "material_category_slug_key" ON "material_category"("slug");
CREATE INDEX "material_category_sortOrder_idx" ON "material_category"("sortOrder");

ALTER TABLE "material"
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "code" TEXT,
  ADD COLUMN "swatchColor" TEXT;

-- Make room for preserved legacy FabricItem rows that have no photo yet.
ALTER TABLE "material" ALTER COLUMN "image" DROP NOT NULL;

-- Legacy rows become categories using their stored category label (normalized
-- only for grouping); no categories are inferred from Material.type. Known
-- translations are explicit. Unknown labels keep their English name and an
-- empty Persian value, which keeps them unpublished until an admin translates
-- them. Existing item photography supplies a cover only when one exists.
WITH category_labels AS (
  SELECT LOWER(BTRIM("category")) AS category_key, MIN(BTRIM("category")) AS label
  FROM (
    SELECT "category" FROM "material"
    UNION ALL
    SELECT "category" FROM "fabric_item"
  ) source_categories
  GROUP BY LOWER(BTRIM("category"))
), category_bases AS (
  SELECT
    category_key,
    label,
    COALESCE(
      NULLIF(BTRIM(REGEXP_REPLACE(LOWER(category_key), '[^a-z0-9]+', '-', 'g'), '-'), ''),
      'legacy-' || SUBSTRING(MD5(category_key), 1, 10)
    ) AS slug_base
  FROM category_labels
), category_slugs AS (
  SELECT
    category_key,
    label,
    CASE
      WHEN COUNT(*) OVER (PARTITION BY slug_base) > 1
        THEN slug_base || '-' || SUBSTRING(MD5(category_key), 1, 8)
      WHEN EXISTS (SELECT 1 FROM "material" m WHERE m."slug" = slug_base)
        OR EXISTS (SELECT 1 FROM "fabric_item" f WHERE f."id" = slug_base)
        THEN slug_base || '-materials'
      ELSE slug_base
    END AS slug
  FROM category_bases
), category_rows AS (
  SELECT
    'material-category-' || MD5(category_key) AS id,
    category_key,
    label,
    slug,
    CASE category_key
      WHEN 'stone' THEN 'سنگ'
      WHEN 'stones' THEN 'سنگ‌ها'
      WHEN 'metal' THEN 'فلز'
      WHEN 'metals' THEN 'فلزات'
      WHEN 'glass' THEN 'شیشه'
      WHEN 'wood' THEN 'چوب'
      WHEN 'woods' THEN 'چوب‌ها'
      WHEN 'fabric' THEN 'پارچه‌ها'
      WHEN 'fabrics' THEN 'پارچه‌ها'
      WHEN 'leather' THEN 'چرم'
      WHEN 'leathers' THEN 'چرم‌ها'
      WHEN 'marble' THEN 'مرمر'
      WHEN 'marbles' THEN 'مرمرها'
      WHEN 'stone-composite' THEN 'سنگ ترکیبی'
      ELSE ''
    END AS fa_name,
    (
      SELECT m."image"
      FROM "material" m
      WHERE LOWER(BTRIM(m."category")) = category_labels.category_key
      ORDER BY m."sortOrder" ASC, m."id" ASC
      LIMIT 1
    ) AS cover_image,
    ROW_NUMBER() OVER (ORDER BY category_key) - 1 AS sort_order
  FROM category_labels
  JOIN category_slugs USING (category_key, label)
)
INSERT INTO "material_category" ("id", "slug", "name", "image", "sortOrder")
SELECT
  id,
  slug,
  JSONB_BUILD_OBJECT('en', label, 'fa', fa_name),
  cover_image,
  sort_order
FROM category_rows;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "material_category" c
    JOIN "material" m ON m."slug" = c."slug"
  ) THEN
    RAISE EXCEPTION 'Cannot migrate materials: a material category slug collides with an existing material item slug. Review the conflicting routes before retrying.';
  END IF;
END $$;

UPDATE "material" m
SET "categoryId" = c."id"
FROM "material_category" c
WHERE LOWER(BTRIM(m."category")) = LOWER(BTRIM(c."name"->>'en'));

-- Preserve every fabric row as an incomplete material item. The empty Persian
-- name and NULL image intentionally keep these rows out of public results until
-- an admin adds approved localized copy and a real image.
INSERT INTO "material" (
  "id", "slug", "name", "category", "categoryId", "type", "image",
  "description", "code", "swatchColor", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  f."id",
  f."id",
  JSONB_BUILD_OBJECT('en', f."name", 'fa', ''),
  f."category",
  c."id",
  'fabric'::"MaterialType",
  NULL,
  JSONB_BUILD_OBJECT('en', '', 'fa', ''),
  f."code",
  f."swatchColor",
  f."sortOrder",
  f."createdAt",
  f."updatedAt"
FROM "fabric_item" f
JOIN "material_category" c
  ON LOWER(BTRIM(f."category")) = LOWER(BTRIM(c."name"->>'en'));

ALTER TABLE "material" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "material"
  ADD CONSTRAINT "material_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "material_category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "material_categoryId_sortOrder_idx" ON "material"("categoryId", "sortOrder");
