/**
 * Pass 16 — the payment-authority lookup is indexed.
 *
 * WHY THIS TEST EXISTS
 *
 * The callback resolves a payment to its order by AUTHORITY, not by any
 * client-supplied id:
 *
 *   app/[locale]/(site)/checkout/callback/page.tsx → order.findFirst({ zarinpalAuthority })
 *   lib/payments/settlement.ts → findOrderByAuthority()
 *
 * That query runs on EVERY customer return from ZarinPal, so it is the single
 * hottest lookup in the commerce system. It had no index, making it a
 * sequential scan of the whole `order` table — invisible on a dev-sized dataset
 * and a real latency problem in production.
 *
 * A schema-level assertion is the right shape here: the risk is not that the
 * query is wrong (behaviour tests cover that) but that the INDEX is quietly
 * dropped from `prisma/schema.prisma` in a future refactor. Asserting on the
 * schema catches that in milliseconds, without a database.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  path.join(process.cwd(), "prisma", "schema.prisma"),
  "utf8",
);

/** The `model Order { ... }` block, so we never match a different model. */
function orderModelBlock(): string {
  const start = schema.indexOf("model Order {");
  expect(start, "model Order must exist in the schema").toBeGreaterThan(-1);
  const end = schema.indexOf("\n}", start);
  return schema.slice(start, end);
}

describe("Order indexes", () => {
  it("indexes zarinpalAuthority — the callback's order-resolution key", () => {
    expect(orderModelBlock()).toContain("@@index([zarinpalAuthority])");
  });

  it("keeps zarinpalAuthority NOT unique", () => {
    // Deliberate: the authority is issued by ZarinPal. A unique constraint
    // would turn a historical duplicate into a failed INSERT at checkout time,
    // breaking NEW orders to police data that does not exist.
    const block = orderModelBlock();
    expect(block).toContain("zarinpalAuthority  String?");
    expect(block).not.toContain("zarinpalAuthority  String?  @unique");
    expect(block).not.toContain("zarinpalAuthority String? @unique");
  });

  it("keeps the idempotency key unique — the duplicate-checkout guard", () => {
    expect(orderModelBlock()).toContain(
      "idempotencyKey     String?           @unique",
    );
  });

  it("keeps the customer-history and cleanup indexes", () => {
    const block = orderModelBlock();
    // `userId` — getMyOrders / getMyOrder scope by owner.
    expect(block).toContain("@@index([userId])");
    // `status` / `fulfillmentStatus` — the stale sweep and admin lists.
    expect(block).toContain("@@index([status])");
    expect(block).toContain("@@index([fulfillmentStatus])");
  });

  it("indexes the OrderItem FKs used by stock release and re-reservation", () => {
    const start = schema.indexOf("model OrderItem {");
    const end = schema.indexOf("\n}", start);
    const block = schema.slice(start, end);
    // releaseOrderStock / reReserveOrderStock both look items up by orderId;
    // the productId index serves the "history for this product" direction.
    expect(block).toContain("@@index([orderId])");
    expect(block).toContain("@@index([productId])");
  });
});
