-- myPlan.md Part A: split Product.price into two independently admin-entered
-- prices.
--
--   priceEur   — the existing EUR values, renamed verbatim (display only).
--   priceToman — new column, defaults to 0 for every existing row. 0 means
--                "not available for purchase" until an admin backfills it.
--
-- The rename (rather than drop + add) preserves the current EUR data, so no
-- value has to be re-entered for the English-locale display.

-- AlterTable: price -> priceEur (data preserved)
ALTER TABLE "product" RENAME COLUMN "price" TO "priceEur";

-- AlterTable: new Toman column, whole Toman (no minor unit)
ALTER TABLE "product" ADD COLUMN "priceToman" DECIMAL(14,0) NOT NULL DEFAULT 0;

-- AlterTable: order amounts are now recorded in Toman, not EUR
ALTER TABLE "order" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(14,0);
ALTER TABLE "order" ALTER COLUMN "currency" SET DEFAULT 'TOMAN';
UPDATE "order" SET "currency" = 'TOMAN' WHERE "currency" = 'EUR';
ALTER TABLE "order_item" ALTER COLUMN "unitPriceAtPurchase" SET DATA TYPE DECIMAL(14,0);