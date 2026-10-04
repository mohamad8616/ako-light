/**
 * The customer order pages, over real HTTP (Pass 15).
 *
 * This file mocks NOTHING: it boots the real Next app, signs in over the real
 * `/api/auth/*` surface with a real cookie jar, and then fetches `/orders` and
 * `/orders/<id>` to assert what the SERVER actually returns.
 *
 * The point is ownership. A unit test can prove `getMyOrder` filters by
 * `userId`; only this can prove the ROUTE does — that a signed-in customer
 * asking for someone else's order gets a 404 rather than a rendered page, and
 * that a signed-out visitor is sent to sign-in instead of seeing anything.
 *
 * IMPORTANT: fixtures are written with the harness's raw-SQL `query()`, NOT with
 * `@/lib/db/prisma`. Importing the app's Prisma client into a worker that has
 * also booted Next breaks the app — the same failure mode the harness documents
 * for `next/headers` stubbing — and every route (including sign-up) starts
 * answering 500. Every other file in this tier avoids it for that reason.
 *
 * `fetchPageWhenWarm` retries while the dev server compiles the route, which is
 * why the budgets below are generous.
 *
 * Part of the `auth` Vitest project (vitest.config.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CookieJar,
  cleanupFixture,
  closeDb,
  fetchPageWhenWarm,
  hasDatabaseUrl,
  query,
  registerUser,
  signInAs,
  startAuthServer,
  stopAuthServer,
  uniqueTestIp,
  type TestUser,
} from "@/tests/helpers/auth-db";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

/**
 * The document's VISIBLE text.
 *
 * A raw `html.includes(key)` check is unreliable here: since Pass 13.6C the
 * dictionary travels in the RSC payload, so the response legitimately contains
 * every `orders.*` KEY even when nothing rendered it. Stripping `<script>`
 * blocks first is what makes this assert on what a visitor actually sees.
 */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, " ");
}

const SEED_CATEGORY_ID = "lighting";
/** See order-stock.test.ts — never sort a fixture ahead of real seed rows. */
const LEAKED_FIXTURE_SORT_ORDER = 9_999;

const created: TestUser[] = [];
const orderIds: string[] = [];
const productIds: string[] = [];

/** A committed product + order for `userId`, written with raw SQL. */
async function makeOrderFor(userId: string, label: string) {
  const productId = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  productIds.push(productId);
  orderIds.push(orderId);

  await query(
    `INSERT INTO "product"
       (id, slug, name, "hoverImage", "heroImage", "priceEur", "priceToman",
        "existsInStore", quantity, description, downloads, related,
        "sortOrder", "categoryId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, true, 5, $8::jsonb,
             '[]'::jsonb, '[]'::jsonb, $9, $10, NOW(), NOW())`,
    [
      productId,
      `orders-ui-${productId}`,
      JSON.stringify({ en: `${label} Product`, fa: `${label} محصول` }),
      "/test-hover.jpg",
      "/test-hero.jpg",
      10,
      5_000_000,
      JSON.stringify({ en: "d", fa: "د" }),
      LEAKED_FIXTURE_SORT_ORDER,
      SEED_CATEGORY_ID,
    ],
  );

  await query(
    `INSERT INTO "order"
       (id, "userId", status, "fulfillmentStatus", "totalAmount", currency,
        "recipientName", phone, "addressLine", city, "postalCode",
        "createdAt", "updatedAt")
     VALUES ($1, $2, 'paid'::"OrderStatus", 'shipped'::"FulfillmentStatus",
             $3, 'TOMAN', $4, $5, $6, $7, $8, NOW(), NOW())`,
    [
      orderId,
      userId,
      5_000_000,
      "Order UI Recipient",
      "09120000000",
      "1 UI Street",
      "Tehran",
      "1234567890",
    ],
  );

  await query(
    `INSERT INTO "order_item"
       (id, "orderId", "productId", quantity, "unitPriceAtPurchase", name, image)
     VALUES ($1, $2, $3, 1, $4, $5::jsonb, $6)`,
    [
      itemId,
      orderId,
      productId,
      5_000_000,
      // A distinctive snapshot, so a test can prove the SNAPSHOT rendered
      // rather than the live product row.
      JSON.stringify({ en: `${label} Snapshot`, fa: `${label} اسنپ‌شات` }),
      "/snapshot.jpg",
    ],
  );

  return { orderId, productId };
}

async function signedInCustomer() {
  const user = await registerUser();
  created.push(user);
  const { jar } = await signInAs(user.email, user.password, {
    ip: uniqueTestIp(),
  });
  return { user, jar };
}

describeAuth("customer order history — real HTTP surface", () => {
  let origin: string;

  beforeAll(async () => {
    ({ origin } = await startAuthServer());
  });

  afterAll(async () => {
    for (const id of orderIds.splice(0)) {
      await query(`DELETE FROM "order_item" WHERE "orderId" = $1`, [id]).catch(() => {});
      await query(`DELETE FROM "order" WHERE id = $1`, [id]).catch(() => {});
    }
    for (const id of productIds.splice(0)) {
      await query(`DELETE FROM "order_item" WHERE "productId" = $1`, [id]).catch(() => {});
      await query(`DELETE FROM "product" WHERE id = $1`, [id]).catch(() => {});
    }
    await cleanupFixture({
      userIds: created.map((u) => u.id),
      emails: created.map((u) => u.email),
    });
    await stopAuthServer();
    await closeDb();
  });

  it(
    "renders the signed-in customer's own orders in the default (English) tree",
    async () => {
      const { user, jar } = await signedInCustomer();
      const { orderId } = await makeOrderFor(user.id, "Mine");

      const response = await fetchPageWhenWarm(origin, "/orders", jar);
      expect(response.status).toBe(200);
      const html = await response.text();

      // The order really is listed…
      expect(html).toContain(orderId);
      // …in English, because the unprefixed URL is the default locale.
      expect(html).toMatch(/<html[^>]*lang="en"/);
      expect(html).toMatch(/<html[^>]*dir="ltr"/);
      // No raw translation key reached the VISIBLE text.
      expect(visibleText(html)).not.toContain("orders.title");
    },
    300_000,
  );

  it(
    "renders the order detail from the stored snapshot, not the live product",
    async () => {
      const { user, jar } = await signedInCustomer();
      const { orderId, productId } = await makeOrderFor(user.id, "Detail");

      // The product changes AFTER the order was placed.
      await query(
        `UPDATE "product" SET name = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`,
        [JSON.stringify({ en: "Renamed After Purchase", fa: "نام جدید" }), productId],
      );

      const response = await fetchPageWhenWarm(origin, `/orders/${orderId}`, jar);
      expect(response.status).toBe(200);
      const html = await response.text();

      expect(html).toContain("Detail Snapshot");
      expect(html).not.toContain("Renamed After Purchase");
      // Shipping details the customer entered are theirs to see.
      expect(html).toContain("Order UI Recipient");
      expect(html).toContain("1 UI Street");
      expect(visibleText(html)).not.toContain("orders.title");
    },
    300_000,
  );

  it(
    "refuses another customer's order with a 404, not a rendered page",
    async () => {
      const owner = await signedInCustomer();
      const intruder = await signedInCustomer();
      const { orderId } = await makeOrderFor(owner.user.id, "Theirs");

      // Warm the dynamic route with the OWNER's request first. The dev server
      // answers 404 while it compiles a route, so without this a 404 would be
      // ambiguous — and `fetchPageWhenWarm` cannot be used for the assertion
      // below, because it deliberately RETRIES on 404 and would never return a
      // legitimate one.
      const warm = await fetchPageWhenWarm(
        origin,
        `/orders/${orderId}`,
        owner.jar,
      );
      expect(warm.status).toBe(200);

      const response = await fetch(new URL(`/orders/${orderId}`, origin), {
        headers: { cookie: intruder.jar.header() ?? "" },
        redirect: "manual",
      });

      expect(response.status).toBe(404);
      const html = await response.text();
      // None of the owner's data is rendered. Checked against the visible text:
      // the 404 shell legitimately carries the dictionary in its RSC payload.
      const visible = visibleText(html);
      expect(visible).not.toContain("Theirs Snapshot");
      expect(visible).not.toContain("Order UI Recipient");
      expect(visible).not.toContain("1 UI Street");
    },
    300_000,
  );

  it(
    "does not list another customer's order on the history page",
    async () => {
      const owner = await signedInCustomer();
      const intruder = await signedInCustomer();
      const { orderId } = await makeOrderFor(owner.user.id, "NotMine");

      const response = await fetchPageWhenWarm(origin, "/orders", intruder.jar);
      expect(response.status).toBe(200);
      const html = await response.text();

      expect(html).not.toContain(orderId);
    },
    300_000,
  );

  it(
    "sends a signed-out visitor to sign-in instead of showing orders",
    async () => {
      const response = await fetchPageWhenWarm(origin, "/orders", new CookieJar());

      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
      const location = response.headers.get("location") ?? "";
      expect(location).toContain("/sign-in");
      expect(location).toContain("redirectTo");
    },
    300_000,
  );

  it(
    "serves the Persian tree at /fa/orders with lang=fa and dir=rtl",
    async () => {
      const { jar } = await signedInCustomer();

      const response = await fetchPageWhenWarm(origin, "/fa/orders", jar);
      expect(response.status).toBe(200);
      const html = await response.text();

      expect(html).toMatch(/<html[^>]*lang="fa"/);
      expect(html).toMatch(/<html[^>]*dir="rtl"/);
      // The Persian dictionary really is in play, and no raw key reached the
      // visible text.
      expect(visibleText(html)).not.toContain("orders.title");
      expect(html).toMatch(/[\u0600-\u06FF]/);
    },
    300_000,
  );
});
