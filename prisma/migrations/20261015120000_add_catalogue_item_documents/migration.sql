-- Add PDF / PowerPoint uploads to catalogue cards. Nullable to preserve existing
-- rows that still use the legacy `href` until an admin replaces it with upload.
ALTER TABLE "catalogue_item"
  ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "pdfName" TEXT;
