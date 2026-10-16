-- Make the product page's catalogue block
-- (components/products/prod/CatalogueDownloadSection.tsx) editable at
-- /admin/settings.
--
-- All four columns are NULLABLE on purpose: NULL means "use the built-in
-- fallback", so the existing singleton row keeps rendering exactly what it does
-- today until an admin fills a field in. No data backfill is needed.
ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "catalogueTitle"   JSONB,
  ADD COLUMN IF NOT EXISTS "catalogueText"    JSONB,
  ADD COLUMN IF NOT EXISTS "catalogueMediaId" TEXT,
  ADD COLUMN IF NOT EXISTS "catalogueHref"    TEXT;

-- The cover is a Media relation (SetNull, like the logo/favicon): deleting the
-- Media row must clear the reference, never delete the settings row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_catalogueMediaId_fkey'
  ) THEN
    ALTER TABLE "site_settings"
      ADD CONSTRAINT "site_settings_catalogueMediaId_fkey"
      FOREIGN KEY ("catalogueMediaId") REFERENCES "media"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "site_settings_catalogueMediaId_idx"
  ON "site_settings" ("catalogueMediaId");
