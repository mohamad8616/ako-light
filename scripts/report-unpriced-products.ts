/**
 * myPlan.md Part E step 9 — pre-launch check.
 *
 * Lists every Product whose priceToman is <= 0. Per Part A step 2 that state
 * means "not available for purchase": the buy button renders disabled and
 * createPendingOrder rejects the item, so none of these can be charged until an
 * admin fills in the Persian price (priceToman) in the product form.
 *
 * Run with: node_modules/.bin/tsx scripts/report-unpriced-products.ts
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const [total, unpriced] = await Promise.all([
  prisma.product.count(),
  prisma.product.findMany({
    where: { priceToman: { lte: 0 } },
    select: { slug: true },
    orderBy: { slug: "asc" },
  }),
]);

await prisma.$disconnect();

console.log(
  `PRODUCTS_TOTAL=${total} PRODUCTS_UNPRICED=${unpriced.length} PRODUCTS_PRICED=${total - unpriced.length}`,
);
for (const { slug } of unpriced) console.log(slug);
process.exit(0);
