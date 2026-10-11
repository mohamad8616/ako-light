-- Pass D.1 — make the homepage HeroSection and VideoSection admin-editable.
--
-- TWO new singleton tables, both additive: no existing table is altered, no row
-- is read, rewritten or deleted, and there is no backfill. Every column the
-- admin can set is NULLABLE on purpose — NULL means "use the component's
-- built-in default" (the static /videos/*.mp4 assets and the hero.* dictionary
-- copy), so the public homepage renders byte-for-byte as before until an
-- operator deliberately changes a field.
--
-- `IF NOT EXISTS` is deliberate, and it is the same evidence-based exception
-- documented in 20261011100000_add_catalogue_feature_cta_pdf: on the
-- development machine `prisma migrate deploy` cannot reliably reach this
-- pooler (Prisma's engine drops the connection with P1017 while a plain `pg`
-- client to the SAME URL succeeds), so a migration that has to be applied by
-- hand must be safe to apply twice. Without the guard, a hand-applied DDL
-- leaves no `_prisma_migrations` row, the next deploy re-runs it, hits
-- `42P07 relation already exists`, and leaves a FAILED row — P3009 on every
-- subsequent run. That trap cost real time in Pass C.3.
--
-- Production is unaffected: it has never seen this migration, so the guard is a
-- no-op there and the rows are recorded normally.

CREATE TABLE IF NOT EXISTS "hero_feature" (
  "id"         TEXT         NOT NULL,
  "enabled"    BOOLEAN      NOT NULL DEFAULT true,
  "videoUrl"   TEXT,
  "posterUrl"  TEXT,
  "firstLine"  JSONB,
  "secondLine" JSONB,
  "ctaLabel"   JSONB,
  "ctaHref"    TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "hero_feature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "video_feature" (
  "id"        TEXT         NOT NULL,
  "enabled"   BOOLEAN      NOT NULL DEFAULT true,
  "videoUrl"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "video_feature_pkey" PRIMARY KEY ("id")
);
