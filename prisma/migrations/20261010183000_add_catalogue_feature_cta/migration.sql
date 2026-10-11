-- AlterTable
-- Editable Catalogue CTA (Pass C.3).
--
-- `ctaLabel` is a localized { en, fa } pair; `ctaHref` is a single shared URL
-- (this project keeps one address per link — see CatalogueItem.href).
-- Both are NULLABLE on purpose: every existing row keeps working, and a NULL
-- falls back to the current behaviour (the composed default label, and
-- CatalogueItem.href), so no data backfill is needed.
--
-- One ALTER, two columns: Postgres applies this atomically, so a failure cannot
-- leave the table with only half of the pair.
ALTER TABLE "catalogue_feature" ADD COLUMN     "ctaLabel" JSONB,
ADD COLUMN     "ctaHref" TEXT;
