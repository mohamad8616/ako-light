-- AlterTable
-- The Catalogue section's paragraph becomes editable from the admin panel.
-- Nullable on purpose: every existing row keeps working, and a NULL/empty value
-- falls back to the static `catalogue.description` translation in the component,
-- so no data backfill is needed and no section can go blank.
ALTER TABLE "catalogue_feature" ADD COLUMN     "paragraphs" JSONB;
