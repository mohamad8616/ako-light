import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * Reports (and optionally removes) leaked test fixtures.
 *
 * These rows come from the order/payment test tiers, which create products with
 * a `<prefix>-<uuid>` slug and delete them in a `finally`:
 *
 *   - `stock-test-<key>`  — tests/server/order-stock.test.ts
 *   - `settle-test-<uuid>`— tests/server/order-stock.test.ts and
 *                           tests/server/payment-settlement.test.ts
 *   - `cancel-test-<uuid>`— tests/server/cancelled-order-stock.test.ts
 *
 * A test run that is KILLED (timeout, hung process) never reaches that block, so
 * the rows survive in the shared dev database — and because they carry
 * sortOrder 9999 (later tiers) or 0 (earlier ones) they can sort to the FRONT of
 * their category, which is how two of them once ended up as the homepage
 * carousel's first slide.
 *
 * Scope is deliberately narrow: only slugs with those exact prefixes, which no
 * seed row or admin-created row can have. Dry run unless APPLY=1.
 *
 * A leaked product also drags its orders along: `OrderItem.productId` is
 * SetNull, so deleting the product would leave an orphan Order behind, which is
 * why the orders themselves are removed too.
 *
 * Run with:
 *   node_modules/.bin/tsx scripts/clean-leaked-test-fixtures.ts          # report
 *   APPLY=1 node_modules/.bin/tsx scripts/clean-leaked-test-fixtures.ts  # delete
 */
const APPLY = process.env.APPLY === "1";

/** Slug prefixes only the test tiers can produce. Keep in sync with tests/. */
const LEAKED_SLUG_PREFIXES = [
  "stock-test-",
  "settle-test-",
  "cancel-test-",
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const leaked = await prisma.product.findMany({
  where: {
    OR: LEAKED_SLUG_PREFIXES.map((prefix) => ({
      slug: { startsWith: prefix },
    })),
  },
  select: {
    id: true,
    slug: true,
    sortOrder: true,
    categoryId: true,
    productImages: { select: { id: true } },
    projectsUsed: { select: { projectId: true } },
    orderItems: { select: { id: true, orderId: true } },
  },
});

console.log(`leaked fixture products: ${leaked.length}\n`);

for (const p of leaked) {
  console.log(
    `  ${p.slug}\n    id=${p.id} sortOrder=${p.sortOrder} category=${p.categoryId} ` +
      `images=${p.productImages.length} projectLinks=${p.projectsUsed.length} ` +
      `orderItems=${p.orderItems.length}`,
  );
}

if (leaked.length === 0) {
  console.log("nothing to clean.");
  await prisma.$disconnect();
  process.exit(0);
}

const productIds = leaked.map((p) => p.id);
const orderIds = [
  ...new Set(leaked.flatMap((p) => p.orderItems.map((i) => i.orderId))),
];

if (orderIds.length > 0) {
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, status: true, totalAmount: true, createdAt: true },
  });
  console.log(`\norders referencing those fixtures: ${orders.length}`);
  for (const o of orders) {
    console.log(`  ${o.id} status=${o.status} total=${o.totalAmount}`);
  }
}

if (!APPLY) {
  console.log("\nDRY RUN — re-run with APPLY=1 to delete.");
  await prisma.$disconnect();
  process.exit(0);
}

// Order items and orders first (OrderItem.productId is SetNull, so it would
// survive a product delete and leave an orphan order behind), then the products
// themselves — ProductImage and ProjectProduct both cascade.
const deletedItems = await prisma.orderItem.deleteMany({
  where: { orderId: { in: orderIds } },
});
const deletedOrders = await prisma.order.deleteMany({
  where: { id: { in: orderIds } },
});
const deletedProducts = await prisma.product.deleteMany({
  where: { id: { in: productIds } },
});

console.log(
  `\ndeleted: orderItems=${deletedItems.count} orders=${deletedOrders.count} products=${deletedProducts.count}`,
);

await prisma.$disconnect();
