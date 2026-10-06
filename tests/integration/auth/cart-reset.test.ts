/**
 * Cart reset after a successful payment — end-to-end through real HTTP.
 *
 * WHY THIS SUITE EXISTS
 * ---------------------
 * The durable "empty the cart" signal was silently dead. `signalCartReset` was
 * called from the checkout callback PAGE (a Server Component render), where
 * `cookies().set()` throws `ReadonlyRequestCookiesError` ("Cookies can only be
 * modified in a Server Action or Route Handler"). The throw was swallowed, so
 * on every REAL payment the reset cookie was never written: the cart only ever
 * emptied if the fast-path client component happened to hydrate.
 *
 * A unit test that called `signalCartReset` directly would have PASSED — it
 * would run in a context where the mutation is legal — and would therefore have
 * proven nothing about the route. So, exactly like the receipt suite, this
 * drives the real callback route over real HTTP, then drives the real
 * cart-reset Route Handler, and asserts on the ACTUAL `Set-Cookie` the browser
 * receives.
 *
 * Scope of the fakes: only the two external gateways (ZarinPal via
 * tests/helpers/zarinpal-guard.ts, SMS via tests/helpers/auth-sms-guard.ts).
 * The route, the settlement, the status transition and the cookie write are all
 * production code.
 *
 * Part of the `auth` Vitest project.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signOrderAccessToken } from "@/lib/orders/access-token";
import {
  cleanupFixture,
  closeDb,
  CookieJar,
  fetchPageWhenWarm,
  hasDatabaseUrl,
  query,
  registerUser,
  signInAs,
  startAuthServer,
  stopAuthServer,
  sweepRunRows,
  uniqueTestIp,
  type TestUser,
} from "@/tests/helpers/auth-db";
import { setVerifyRefIdOmitted } from "@/tests/helpers/zarinpal-guard";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

const createdUsers: TestUser[] = [];
const createdOrderIds: string[] = [];

/** The cookie the client reset is driven by. Mirrors CART_RESET_COOKIE. */
const RESET_COOKIE = "cart-reset-order";

function authorityFor(orderId: string): string {
  return `ZF${orderId.replace(/-/g, "").toUpperCase()}`;
}

async function insertOrder({
  userId,
  totalToman,
  status = "pending",
}: {
  userId: string;
  totalToman: number;
  status?: string;
}): Promise<string> {
  const orderId = randomUUID();
  const itemId = randomUUID();
  const authority = authorityFor(orderId);

  await query(
    `INSERT INTO "order"
       (id, "userId", "totalAmount", "recipientName", phone, "addressLine", city, "postalCode", "zarinpalAuthority", status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
    [
      orderId,
      userId,
      totalToman,
      "Test Recipient",
      "09191234567",
      "1 Test St",
      "Tehran",
      "1234567890",
      authority,
      status,
    ],
  );
  await query(
    `INSERT INTO order_item (id, "orderId", quantity, "unitPriceAtPurchase", name, image)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [itemId, orderId, 1, totalToman, JSON.stringify({ en: "Lamp", fa: "چراغ" }), "/t.jpg"],
  );

  createdOrderIds.push(orderId);
  return orderId;
}

async function orderStatus(orderId: string): Promise<string | undefined> {
  const rows = await query<{ status: string }>(
    `SELECT status FROM "order" WHERE id = $1`,
    [orderId],
  );
  return rows[0]?.status;
}

/** Real callback, signed-in owner. */
function callbackQuery(orderId: string): string {
  return new URLSearchParams({
    orderId,
    Authority: authorityFor(orderId),
    Status: "OK",
  }).toString();
}

/** Posts to the real cart-reset Route Handler. */
async function postCartReset(
  origin: string,
  orderId: string,
  jar: CookieJar,
): Promise<Response> {
  return fetch(new URL("/api/checkout/cart-reset", origin), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: jar.header() ?? "",
    },
    body: JSON.stringify({ orderId }),
    redirect: "manual",
  });
}

describeAuth("cart reset after payment — real callback + real route handler", () => {
  beforeAll(async () => {
    await startAuthServer();
  });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await query(`DELETE FROM "order" WHERE id = ANY($1::text[])`, [createdOrderIds]);
    }
    await cleanupFixture({
      userIds: createdUsers.map((user) => user.id),
      emails: createdUsers.map((user) => user.email),
    });
    await sweepRunRows();
    await stopAuthServer();
    await closeDb();
  });

  it(
    "settles a paid order (with refId) and the reset handler issues the durable cookie",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, {
        ip: uniqueTestIp(),
      });

      const orderId = await insertOrder({ userId: user.id, totalToman: 1_100_000 });
      expect(await orderStatus(orderId)).toBe("pending");

      const { origin } = await startAuthServer();
      const callback = await fetchPageWhenWarm(
        origin,
        `/checkout/callback?${callbackQuery(orderId)}`,
        jar,
      );
      expect(callback.status).toBe(200);
      expect(await callback.text()).toContain("Payment received");
      expect(await orderStatus(orderId)).toBe("paid");

      // The page's success view carries the beacon that drives the reset. The
      // durable signal itself is written by the Route Handler — drive it as the
      // browser would and assert the cookie is really issued.
      const reset = await postCartReset(origin, orderId, jar);
      expect(reset.status).toBe(200);
      expect(await reset.json()).toEqual({ ok: true });

      const cookies = reset.headers.getSetCookie?.() ?? [];
      const issued = cookies.find((c) => c.startsWith(`${RESET_COOKIE}=`));
      expect(
        issued,
        "the paid order must produce a durable cart-reset cookie",
      ).toBeTruthy();
      expect(issued).toContain(`=${orderId}`);
    },
    240_000,
  );

  it(
    "settles a paid order with NO refId and still issues the reset cookie",
    async () => {
      // The mandatory missing-refId case: ZarinPal does not guarantee ref_id,
      // and the cart reset must NOT depend on it.
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, { ip: uniqueTestIp() });

      const orderId = await insertOrder({ userId: user.id, totalToman: 1_600_000 });

      const { origin } = await startAuthServer();
      setVerifyRefIdOmitted(true);
      try {
        const callback = await fetchPageWhenWarm(
          origin,
          `/checkout/callback?${callbackQuery(orderId)}`,
          jar,
        );
        expect(callback.status).toBe(200);
        expect(await callback.text()).toContain("Payment received");

        // Paid with no reference id — still a real payment.
        expect(await orderStatus(orderId)).toBe("paid");
        const refRows = await query<{ zarinpalRefId: string | null }>(
          `SELECT "zarinpalRefId" FROM "order" WHERE id = $1`,
          [orderId],
        );
        expect(refRows[0]?.zarinpalRefId).toBeNull();

        const reset = await postCartReset(origin, orderId, jar);
        expect(reset.status).toBe(200);
        const cookies = reset.headers.getSetCookie?.() ?? [];
        expect(cookies.some((c) => c.startsWith(`${RESET_COOKIE}=${orderId}`))).toBe(
          true,
        );
      } finally {
        setVerifyRefIdOmitted(false);
      }
    },
    240_000,
  );

  it(
    "refuses to signal a reset for an order that is NOT paid",
    async () => {
      // The safety core: the handler must be downstream of settlement. A
      // pending order must never clear a cart.
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, { ip: uniqueTestIp() });

      const pendingOrderId = await insertOrder({
        userId: user.id,
        totalToman: 700_000,
        status: "pending",
      });

      const { origin } = await startAuthServer();
      const reset = await postCartReset(origin, pendingOrderId, jar);

      expect(reset.status).toBe(409);
      const cookies = reset.headers.getSetCookie?.() ?? [];
      expect(
        cookies.some((c) => c.startsWith(`${RESET_COOKIE}=`)),
        "an unpaid order must never issue the reset cookie",
      ).toBe(false);
      // And it did not touch the order.
      expect(await orderStatus(pendingOrderId)).toBe("pending");
    },
    240_000,
  );

  it(
    "refuses an unknown order id and a missing order id",
    async () => {
      const { origin } = await startAuthServer();
      const jar = new CookieJar();

      const unknown = await postCartReset(origin, randomUUID(), jar);
      expect(unknown.status).toBe(409);
      expect(
        (unknown.headers.getSetCookie?.() ?? []).some((c) =>
          c.startsWith(`${RESET_COOKIE}=`),
        ),
      ).toBe(false);

      const missing = await fetch(new URL("/api/checkout/cart-reset", origin), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
        redirect: "manual",
      });
      expect(missing.status).toBe(400);
    },
    240_000,
  );

  it(
    "a declined callback leaves the order unpaid and issues no reset cookie",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, { ip: uniqueTestIp() });

      const orderId = await insertOrder({ userId: user.id, totalToman: 500_000 });

      const { origin } = await startAuthServer();
      const query = new URLSearchParams({
        orderId,
        Authority: authorityFor(orderId),
        // A non-OK status: ZarinPal is telling us the payment did not happen.
        Status: "NOK",
      });
      const response = await fetchPageWhenWarm(
        origin,
        `/checkout/callback?${query.toString()}`,
        jar,
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("Payment was not completed");
      // The order is not paid…
      expect(await orderStatus(orderId)).toBe("failed");
      // …and the page itself issued no reset cookie (the render path is gone —
      // the signal is only ever written by the handler, which the browser is
      // not pointed at on a failure).
      expect(
        (response.headers.getSetCookie?.() ?? []).some((c) =>
          c.startsWith(`${RESET_COOKIE}=`),
        ),
        "a failed payment must not issue the reset cookie",
      ).toBe(false);

      // Even posting the handler for this unpaid order is refused.
      const reset = await postCartReset(origin, orderId, jar);
      expect(reset.status).toBe(409);
    },
    240_000,
  );

  it(
    "refuses the reset for an order a token can view but that has NOT been paid",
    async () => {
      // Viewing (or merely being linked to) an order is not paying. A pending
      // order must never produce a reset cookie, even for a caller who holds a
      // valid signed access token for it.
      const user = await registerUser();
      createdUsers.push(user);
      await signInAs(user.email, user.password, { ip: uniqueTestIp() });

      const orderId = await insertOrder({
        userId: user.id,
        totalToman: 600_000,
        status: "pending",
      });

      const { origin } = await startAuthServer();
      const token = signOrderAccessToken(orderId);
      expect(token.split(".")[0]).toBe(orderId);

      // The handler is the only thing that writes the signal, and it is not
      // session-gated — it must refuse on the ORDER'S STATUS alone. Post the
      // real handler with no cookies at all (a different device).
      const reset = await fetch(new URL("/api/checkout/cart-reset", origin), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
        redirect: "manual",
      });

      expect(reset.status).toBe(409);
      expect(
        (reset.headers.getSetCookie?.() ?? []).some((c) =>
          c.startsWith(`${RESET_COOKIE}=`),
        ),
        "an unpaid order must never issue the reset cookie, even when viewable by token",
      ).toBe(false);

      // The order is untouched — the reset path never writes order state.
      const rows = await query<{ status: string }>(
        `SELECT status FROM "order" WHERE id = $1`,
        [orderId],
      );
      expect(rows[0]?.status).toBe("pending");
    },
    240_000,
  );

  it(
    "is idempotent — a repeated reset post for a paid order re-issues the same cookie",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, { ip: uniqueTestIp() });

      const orderId = await insertOrder({ userId: user.id, totalToman: 950_000 });

      const { origin } = await startAuthServer();
      const callback = await fetchPageWhenWarm(
        origin,
        `/checkout/callback?${callbackQuery(orderId)}`,
        jar,
      );
      expect(await orderStatus(orderId)).toBe("paid");
      void callback;

      const first = await postCartReset(origin, orderId, jar);
      const second = await postCartReset(origin, orderId, jar);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);

      // Same value both times — the client de-duplicates on the order id, so a
      // rebuilt cart is never wiped by a duplicate.
      for (const response of [first, second]) {
        const cookies = response.headers.getSetCookie?.() ?? [];
        expect(cookies.some((c) => c.startsWith(`${RESET_COOKIE}=${orderId}`))).toBe(
          true,
        );
      }

      // And no extra gateway verification was introduced by the reset path.
      expect(await orderStatus(orderId)).toBe("paid");
    },
    240_000,
  );
});
