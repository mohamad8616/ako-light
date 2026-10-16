-- Localized { en, fa } label for the catalogue CTA button on the product page.
-- NULL keeps the dictionary label (`products.catalogue.download`), the same
-- "null = use the built-in" contract every other catalogue column follows.
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "catalogueCtaLabel" JSONB;

-- Presentable filename of the catalogue CTA document, paired with
-- `catalogueHref`. The download route needs it for Content-Disposition.
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "catalogueName" TEXT;
