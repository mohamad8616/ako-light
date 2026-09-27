/**
 * resolveTesting.md step 4 — verification query.
 * Counts leftover slug-collision-test rows by prefix after a full test run.
 * Each count must be exactly 0 after every run.
 *
 * Run with: node_modules/.bin/tsx scripts/verify-slug-collision-cleanup.ts
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const cat = await prisma.productCategory.count({
  where: {
    OR: [
      { id: { startsWith: "cat-a-" } },
      { id: { startsWith: "cat-b-" } },
      { id: { startsWith: "cat-product-" } },
    ],
  },
});
const product = await prisma.product.count({
  where: { id: { startsWith: "product-collision-" } },
});
const fabric = await prisma.fabricItem.count({
  where: { id: { startsWith: "fab-" } },
});

await prisma.$disconnect();

// Space-separated so the burst loop can parse it easily.
console.log(`CAT=${cat} PRODUCT=${product} FABRIC=${fabric}`);
process.exit(0);
