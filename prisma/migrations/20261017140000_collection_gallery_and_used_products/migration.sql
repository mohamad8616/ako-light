-- Collections gain the two sections the public page used to render statically:
-- the gallery photos and the list of products used in the collection.
--
-- Both columns are ADDITIVE with a default, so every existing row is valid the
-- moment they land: `gallery` starts empty (the public page falls back to the
-- legacy `lib/data/imageGalleries` set) and `usedProducts` starts `[]` (the
-- "products in collection" section falls back to every category, which is what
-- it rendered before). No backfill, nothing to rewrite.
--
-- `IF NOT EXISTS` follows the same hand-apply convention as
-- 20261014120000_add_project_portfolio_sections: on the development machine
-- `prisma migrate deploy` cannot reliably reach the pooler, so a hand-applied
-- migration must be safe to run twice — otherwise the next deploy hits
-- `42701 column already exists` and leaves a FAILED row behind (P3009).

ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "gallery" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "usedProducts" JSONB NOT NULL DEFAULT '[]'::jsonb;
