-- AlterTable
-- The video section's poster frame (Pass D.1 follow-up): the frame shown before
-- the video starts playing, mirroring the hero's poster.
-- Additive and idempotent, so applying it by hand over the pooler (where
-- `prisma migrate deploy` cannot reach the schema engine) is safe to re-run.
ALTER TABLE "video_feature" ADD COLUMN IF NOT EXISTS "posterUrl" TEXT;
