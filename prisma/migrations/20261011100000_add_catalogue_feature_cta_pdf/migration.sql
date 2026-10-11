-- Pass C.4 — let the Catalogue CTA point at an UPLOADED pdf.
--
-- Two nullable columns, added in ONE statement so Postgres applies them
-- atomically: a failure can never leave the pair half-added.
--
-- Both are nullable on purpose. NULL means "no uploaded file", which is exactly
-- what every row saved before this column existed carries, so the section keeps
-- its current behaviour with NO backfill: the destination falls back to
-- `ctaHref` and then to `CatalogueItem.href`.
--
-- `IF NOT EXISTS` is deliberate, and it is the one place this project uses it.
-- The reason is evidence, not convenience: on the development machine
-- `prisma migrate deploy` fails against this pooler with
-- `P1017 Server has closed the connection` (Prisma's engine drops the
-- connection during the migration; a plain `pg` client to the same URL is
-- fine). A migration that CANNOT reliably be applied by the tool has to be
-- safe to apply twice, or an operator who runs the DDL by hand — the only
-- option left — then meets `42701 column already exists` on the next deploy and
-- is left with a FAILED row in `_prisma_migrations` and a P3009 on every
-- subsequent run. This exact trap cost real time in Pass C.3.
--
-- Production is unaffected: it has never seen this migration, so the guard is a
-- no-op there and the row is recorded normally.

ALTER TABLE "catalogue_feature"
  ADD COLUMN IF NOT EXISTS "ctaPdfUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "ctaPdfName" TEXT;
