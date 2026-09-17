-- Corrective migration: the preceding conversion was already applied in dev.
-- Preserve its checksum/history. Replace each FK column additively here.
-- Also supports the original slug-target constraints for isolated replay tests:
-- the constraint's actual target determines the join, never id == slug.
BEGIN;
LOCK TABLE "product_category", "designer", "product", "project",
  "product_image", "project_product" IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  relation RECORD;
  target_column TEXT;
  replacement TEXT;
  unmatched BIGINT;
  counts_before JSONB;
  counts_after JSONB;
BEGIN
  SELECT jsonb_build_array(
    (SELECT count(*) FROM "product"),
    (SELECT count(*) FROM "product_image"),
    (SELECT count(*) FROM "project_product")
  ) INTO counts_before;

  FOR relation IN SELECT * FROM (VALUES
    ('product', 'categoryId', 'product_category', 'CASCADE', false),
    ('product', 'designerId', 'designer', 'SET NULL', true),
    ('product_image', 'productId', 'product', 'CASCADE', false),
    ('project_product', 'projectId', 'project', 'CASCADE', false),
    ('project_product', 'productId', 'product', 'CASCADE', false)
  ) AS f(child, column_name, parent, delete_action, nullable)
  LOOP
    SELECT a.attname INTO STRICT target_column
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = c.confkey[1]
    WHERE c.conrelid = to_regclass(format('%I', relation.child))
      AND c.conname = relation.child || '_' || relation.column_name || '_fkey'
      AND c.contype = 'f';
    IF target_column NOT IN ('slug', 'id') THEN
      RAISE EXCEPTION 'Unexpected FK target: %', target_column;
    END IF;

    replacement := relation.column_name || '_new_id';
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I TEXT', relation.child, replacement);
    EXECUTE format(
      'UPDATE %I child SET %I = parent.id FROM %I parent WHERE child.%I = parent.%I',
      relation.child, replacement, relation.parent, relation.column_name, target_column);
    EXECUTE format(
      'SELECT count(*) FROM %I WHERE %I IS NOT NULL AND %I IS NULL',
      relation.child, relation.column_name, replacement) INTO unmatched;
    IF unmatched <> 0 THEN
      RAISE EXCEPTION 'Backfill failed for %.%: % unmatched rows',
        relation.child, relation.column_name, unmatched;
    END IF;
    IF NOT relation.nullable THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET NOT NULL', relation.child, replacement);
    END IF;
    -- Validate the new relation BEFORE removing the old data/constraint.
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE %s ON UPDATE CASCADE',
      relation.child, replacement || '_fkey', replacement, relation.parent, relation.delete_action);
    EXECUTE format('ALTER TABLE %I DROP COLUMN %I', relation.child, relation.column_name);
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', relation.child, replacement, relation.column_name);
    EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I',
      relation.child, replacement || '_fkey', relation.child || '_' || relation.column_name || '_fkey');
  END LOOP;

  SELECT jsonb_build_array(
    (SELECT count(*) FROM "product"),
    (SELECT count(*) FROM "product_image"),
    (SELECT count(*) FROM "project_product")
  ) INTO counts_after;
  IF counts_before <> counts_after THEN
    RAISE EXCEPTION 'Row counts changed: % -> %', counts_before, counts_after;
  END IF;
  RAISE NOTICE 'Catalog FK row counts unchanged: % -> %', counts_before, counts_after;
END $$;

-- DROP COLUMN removed the indexes/compound PK which used the old columns.
CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");
CREATE INDEX "product_designerId_idx" ON "product"("designerId");
CREATE INDEX "product_image_productId_idx" ON "product_image"("productId");
ALTER TABLE "project_product" ADD CONSTRAINT "project_product_pkey" PRIMARY KEY ("projectId", "productId");
CREATE INDEX "project_product_productId_idx" ON "project_product"("productId");
COMMIT;
