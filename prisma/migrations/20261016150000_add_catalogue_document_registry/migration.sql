-- Registry of every PDF/PowerPoint uploaded through the admin.
--
-- Documents are NOT `media` rows (that table is the image/video library), so
-- before this table the only record of an uploaded document was the URL column
-- on whichever row referenced it. That made "pick an already-uploaded document"
-- and "refuse a duplicate upload" both impossible. See the model note in
-- prisma/schema.prisma.
CREATE TABLE IF NOT EXISTS "catalogue_document" (
  "id"         TEXT      NOT NULL,
  "filename"   TEXT      NOT NULL,
  "size"       INTEGER   NOT NULL,
  "url"        TEXT      NOT NULL,
  "storageKey" TEXT      NOT NULL,
  "extension"  TEXT      NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "catalogue_document_pkey" PRIMARY KEY ("id")
);

-- `storageKey` is unique: the same stored object can never be registered twice,
-- which is what makes `registerCatalogueDocument` idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS "catalogue_document_storageKey_key"
  ON "catalogue_document" ("storageKey");

-- The duplicate guard compares BOTH filename and size, so they are indexed
-- together; the picker's newest-first list uses the createdAt index.
CREATE INDEX IF NOT EXISTS "catalogue_document_filename_size_idx"
  ON "catalogue_document" ("filename", "size");

CREATE INDEX IF NOT EXISTS "catalogue_document_createdAt_idx"
  ON "catalogue_document" ("createdAt");
