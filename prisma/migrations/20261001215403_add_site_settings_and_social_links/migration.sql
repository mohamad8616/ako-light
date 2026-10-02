-- Pass 13.5D — global site settings, brand assets (via Media) and social links.
--
-- PURELY ADDITIVE: two new tables, one index, two foreign keys. No DROP, no
-- DROP COLUMN, no DELETE, and no existing table or column is touched, so the
-- live site keeps working throughout.
--
-- Brand assets are Media RELATIONSHIPS (`logoMediaId` / `faviconMediaId`), not
-- blob URLs, filenames or storage keys — the plan forbids storing any of those.
-- Both FKs are ON DELETE SET NULL: deleting a Media row must never delete the
-- settings, and the site falls back to the text wordmark / static favicon.
--
-- The `social_link` table stores DATA ONLY. `platform` is a machine key the
-- frontend maps to an icon; unknown keys render a fallback icon rather than
-- crashing, so new platforms need no code change.

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "siteName" JSONB NOT NULL,
    "siteDescription" JSONB NOT NULL,
    "logoMediaId" TEXT,
    "faviconMediaId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_link" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "social_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_link_sortOrder_idx" ON "social_link"("sortOrder");

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_faviconMediaId_fkey" FOREIGN KEY ("faviconMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
