-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('unfulfilled', 'shipped', 'delivered', 'cancelled');

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'unfulfilled';

-- CreateIndex
CREATE INDEX "order_fulfillmentStatus_idx" ON "order"("fulfillmentStatus");
