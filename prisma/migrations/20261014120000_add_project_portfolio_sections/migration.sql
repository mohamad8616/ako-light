-- Pass D.2 — the two sections under a project's gallery become editable content.
--
-- `ProjectTextImageSection` and `ProjectFullImageSection` used to be purely
-- POSITIONAL: the first always rendered `portfolioImages[0]` with
-- `moreDescription[0]`, the second `portfolioImages[1]` with
-- `moreDescription[1]`. So the only way to change either photo was to change the
-- gallery, and the only way to change the text was to edit the shared "more
-- description" list.
--
-- Four ADDITIVE columns give each section its own photo and its own copy. All
-- are NULLABLE and NULL means "use the positional default", which is exactly
-- what every existing row renders today — so there is no backfill, no data is
-- read or rewritten, and the public page is unchanged until an operator sets a
-- field. The same override convention the homepage slots use.
--
-- `IF NOT EXISTS` is deliberate, and it is the same evidence-based exception
-- documented in 20261011160000_add_hero_and_video_features: on the development
-- machine `prisma migrate deploy` cannot reliably reach this pooler (Prisma's
-- engine drops the connection while a plain `pg` client to the SAME URL
-- succeeds), so a migration that has to be applied by hand must be safe to
-- apply twice. Without the guard, a hand-applied DDL leaves no
-- `_prisma_migrations` row, the next deploy re-runs it, hits `42701 column
-- already exists`, and leaves a FAILED row — P3009 on every subsequent run.
--
-- Production is unaffected: it has never seen this migration, so the guard is a
-- no-op there and the rows are recorded normally.

ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "textImageUrl" TEXT;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "textImageText" JSONB;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "fullImageUrl" TEXT;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "fullImageCaption" JSONB;
