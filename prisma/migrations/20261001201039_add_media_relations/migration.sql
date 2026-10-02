-- Pass 13.5C — connect Product images to the central Media system.
--
-- PURELY ADDITIVE, by design. No DROP, no DROP COLUMN, no DELETE, and no
-- existing column is touched. Every row that currently exists keeps rendering
-- from its legacy image url column, because:
--
--   - the `media` table is EMPTY in this environment, and
--   - all 319 image urls currently stored are EXTERNAL (picsum.photos,
--     dummyimage.com, www.henge07.com) — the plan forbids converting those into
--     Media rows (step 6: "If an existing URL is external and cannot safely be
--     converted to Media automatically, keep compatibility with the existing URL
--     and document the migration limitation").
--
-- So `mediaId` starts NULL everywhere and is populated only when an admin
-- attaches a Media item through the library. Reads prefer `media.url` and fall
-- back to the legacy column, which is what makes this a non-event for existing
-- data.
--
-- `ON DELETE SET NULL`, not CASCADE: deleting a Media row must never delete a
-- product or a product image. Removing an image from a product is a different
-- operation that only removes the relationship (docs: remove-relationship ≠
-- delete-media).

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "heroMediaId" TEXT;
ALTER TABLE "product" ADD COLUMN     "hoverMediaId" TEXT;

-- AlterTable
ALTER TABLE "product_image" ADD COLUMN     "mediaId" TEXT;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_hoverMediaId_fkey" FOREIGN KEY ("hoverMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "product_heroMediaId_idx" ON "product"("heroMediaId");

-- CreateIndex
CREATE INDEX "product_hoverMediaId_idx" ON "product"("hoverMediaId");

-- CreateIndex
CREATE INDEX "product_image_mediaId_idx" ON "product_image"("mediaId");
