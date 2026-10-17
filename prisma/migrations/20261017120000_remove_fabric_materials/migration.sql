-- Remove the fabrics feature: its material group, its migrated items, and the
-- legacy fabric_item table it was seeded from.
--
-- Deletion order respects the FK: items reference material_category with
-- ON DELETE RESTRICT, so every fabric item is removed before its group.

-- 1. Every item that still carries the legacy fabric metadata (code/swatchColor
--    were only ever populated by the FabricItem migration) — including any an
--    admin reassigned to another group.
DELETE FROM "material"
WHERE "code" IS NOT NULL OR "swatchColor" IS NOT NULL;

-- 2. Any remaining item that belongs to the fabrics group.
DELETE FROM "material" m
USING "material_category" c
WHERE m."categoryId" = c."id"
  AND c."slug" = 'fabrics';

-- 3. The fabrics group itself.
DELETE FROM "material_category" WHERE "slug" = 'fabrics';

-- 4. The legacy fabric_item table (the feature's original store). The separate
--    seedFabricItems step is gone, so nothing writes this table any more.
DROP TABLE IF EXISTS "fabric_item";

-- 5. The fabric-only columns on "material".
ALTER TABLE "material" DROP COLUMN IF EXISTS "code";
ALTER TABLE "material" DROP COLUMN IF EXISTS "swatchColor";
