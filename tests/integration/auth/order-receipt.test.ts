/**
 * Order receipts, end-to-end through the real payment callback.
 *
 * This is the verification that matters for this feature: the receipt is fired
 * from a SERVER RENDER of the checkout callback route, and a unit test that
 * calls `sendOrderReceipt` directly would prove nothing about whether the route
 * actually reaches it, or whether it fires more than once.
 *
 * So this suite drives the real route over real HTTP with a real signed-in
 * session against the real database. The only things faked are the two external
 * gateways, both intercepted by setup-file guards:
 *
 *   - ZarinPal (tests/helpers/zarinpal-guard.ts) answers the verify call with a
 *     success envelope — no sandbox credential, no money moved;
 *   - sms.ir (tests/helpers/auth-sms-guard.ts) captures the bulk send instead of
 *     delivering it — no real SMS leaves the machine.
 *
 * Everything between them is production code: the route, the order status
 * transition, the channel policy, the message body, and the transport call.
 *
 * Part of the `auth` Vitest project (vitest.config.ts).
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { formatToman } from "@/lib/i18n/price";
import { signOrderAccessToken } from "@/lib/orders/access-token";
import { deliveredBulkSms } from "@/tests/helpers/auth-sms-guard";
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
import { zarinpalCalls } from "@/tests/helpers/zarinpal-guard";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

const createdUsers: TestUser[] = [];
/** Order ids this suite inserted, deleted before the users they belong to. */
const createdOrderIds: string[] = [];

/** Inserts a pending order plus one item, returning the order id. */
async function insertOrder({
  userId,
  phone,
  totalToman,
}: {
  userId: string;
  /** Pass "" to simulate an order with no usable phone at all. */
  phone: string;
  totalToman: number;
}): Promise<string> {
  const orderId = randomUUID();
  const itemId = randomUUID();

  // `updatedAt` is Prisma's `@updatedAt` — the ORM fills it in, so the column
  // has no database default and a raw insert must supply it explicitly.
  await query(
    `INSERT INTO "order"
       (id, "userId", "totalAmount", "recipientName", phone, "addressLine", city, "postalCode", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
    [orderId, userId, totalToman, "Test Recipient", phone, "1 Test St", "Tehran", "1234567890"],
  );

  await query(
    `INSERT INTO order_item (id, "orderId", quantity, "unitPriceAtPurchase", name, image)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [itemId, orderId, 2, totalToman / 2, JSON.stringify({ en: "Lamp", fa: "چراغ" }), "/t.jpg"],
  );

  createdOrderIds.push(orderId);
  return orderId;
}

/** Reads an order's stored status. */
async function orderStatus(orderId: string): Promise<string | undefined> {
  const rows = await query<{ status: string }>(
    `SELECT status FROM "order" WHERE id = $1`,
    [orderId],
  );
  return rows[0]?.status;
}

/**
 * The amount string the confirmation page renders for an `en` locale order —
 * mirrors `formatOrderAmount` in the callback page (`new Intl.NumberFormat`
 * with the order's currency). Both sides use the same rule so the assertion
 * cannot drift from what is actually displayed.
 */
function formatOrderAmountText(totalToman: number): string {
  return `${new Intl.NumberFormat("en-US").format(totalToman)} TOMAN`;
}

/**
 * Drives the real callback route for an order.
 *
 * Goes through the harness's warm-retry helper: on a cold dev cache the first
 * request to this route can come back 404 while Turbopack compiles it, which is
 * not a routing failure (the production build serves it with 200).
 */
async function hitCallback(orderId: string, jar: CookieJar): Promise<Response> {
  const { origin } = await startAuthServer();
  const query = new URLSearchParams({
    orderId,
    Authority: `AUTH-${orderId}`,
    Status: "OK",
  });
  return fetchPageWhenWarm(
    origin,
    `/en/checkout/callback?${query.toString()}`,
    jar,
  );
}

/**
 * Drives the real callback route with an EMPTY cookie jar and a signed token —
 * i.e. exactly the "opened from an SMS/email, signed out, different device"
 * case the token exists for.
 */
async function hitCallbackWithToken(
  orderId: string,
  token: string,
  options: { status?: string; authority?: string | null; orderIdOverride?: string } = {},
): Promise<Response> {
  const { origin } = await startAuthServer();
  const query = new URLSearchParams({
    orderId: options.orderIdOverride ?? orderId,
    Status: options.status ?? "OK",
    token,
  });
  const authority = options.authority ?? `AUTH-${orderId}`;
  if (authority) query.set("Authority", authority);

  // `new CookieJar()` holds nothing, so `header()` is undefined and the request
  // carries no session cookie at all. Using the harness's warm-retry helper
  // (rather than a bare fetch) keeps this immune to a cold Turbopack compile.
  return fetchPageWhenWarm(origin, `/en/checkout/callback?${query.toString()}`, new CookieJar());
}

/** Drives the callback route with no cookie AND no token. */
async function hitCallbackAnonymous(orderId: string): Promise<Response> {
  const { origin } = await startAuthServer();
  const query = new URLSearchParams({
    orderId,
    Authority: `AUTH-${orderId}`,
    Status: "OK",
  });
  return fetchPageWhenWarm(
    origin,
    `/en/checkout/callback?${query.toString()}`,
    new CookieJar(),
  );
}

describeAuth("order receipt — fired by the real payment callback", () => {
  /** Previous values of the SMS env vars, restored in `afterAll`. */
  const previousSmsEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    // `startAuthServer()` also waits for the auth route to compile, so the
    // first sign-up below cannot race a cold Turbopack compile.
    await startAuthServer();

    // Configure the gateway AFTER the server boots (Next loads .env during
    // prepare() and would otherwise overwrite these).
    //
    // Both are required for the real bulk call to happen at all: without
    // SMSIR_LINE_NUMBER, lib/notifications/sms.ts correctly takes its dev
    // fallback and logs the message instead of sending it — so the test would
    // silently prove nothing. Setting them exercises the production path, and
    // the setup-file guard still stops the request leaving the machine.
    for (const key of ["SMSIR_API_KEY", "SMSIR_LINE_NUMBER"]) {
      previousSmsEnv[key] = process.env[key];
    }
    process.env.SMSIR_API_KEY = "test-api-key";
    process.env.SMSIR_LINE_NUMBER = "30004505000017";
  });

  afterAll(async () => {
    for (const [key, value] of Object.entries(previousSmsEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }

    // Orders first: Order.user is onDelete: Restrict, so a user cannot be
    // removed while an order still references them. OrderItem cascades.
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
    "sends one SMS receipt on a successful payment, and never re-sends",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, {
        ip: uniqueTestIp(),
      });

      const orderId = await insertOrder({
        userId: user.id,
        phone: "09191234567",
        totalToman: 1_500_000,
      });
      expect(await orderStatus(orderId)).toBe("pending");

      const smsBefore = deliveredBulkSms.length;
      const callsBefore = zarinpalCalls.length;

      const response = await hitCallback(orderId, jar);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("Payment received");

      // The payment was really verified…
      expect(zarinpalCalls.length).toBeGreaterThan(callsBefore);
      expect(await orderStatus(orderId)).toBe("paid");

      // …and exactly one receipt was dispatched.
      expect(deliveredBulkSms.length - smsBefore).toBe(1);
      const sent = deliveredBulkSms[smsBefore];

      // The recipient is normalised to sms.ir's 10-digit national format.
      expect(sent.mobiles).toEqual(["9191234567"]);
      // The body carries what the plan requires: order id, items, total in
      // Toman, and a link back to the order.
      expect(sent.messageText).toContain(orderId);
      expect(sent.messageText).toContain("چراغ");
      expect(sent.messageText).toContain("× 2");
      // Rendered with the app's own Toman formatter, so the assertion is
      // locale-correct (fa-IR emits Persian digits, not ASCII).
      expect(sent.messageText).toContain(formatToman(1_500_000));
      // …and never the x10 Rial figure that was sent to ZarinPal.
      expect(sent.messageText).not.toContain(formatToman(15_000_000));
      expect(sent.messageText).toContain("/checkout/callback");
      expect(sent.messageText).toContain("orderId=");

      // Re-opening the callback (a refresh, or the link in the receipt itself)
      // must NOT send a second copy.
      const again = await hitCallback(orderId, jar);
      expect(again.status).toBe(200);
      expect(
        deliveredBulkSms.length - smsBefore,
        "the receipt must fire only on the pending -> paid transition",
      ).toBe(1);
    },
    240_000,
  );

  it(
    "emits a signed single-order token in the receipt link",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, {
        ip: uniqueTestIp(),
      });

      const orderId = await insertOrder({
        userId: user.id,
        phone: "09191234567",
        totalToman: 900_000,
      });

      const smsBefore = deliveredBulkSms.length;
      const response = await hitCallback(orderId, jar);
      expect(response.status).toBe(200);

      expect(deliveredBulkSms.length - smsBefore).toBe(1);
      const sent = deliveredBulkSms[smsBefore];

      // The link must carry `token=`, or it is useless to a logged-out reader.
      const link = sent.messageText.split("\n").find((line) =>
        line.includes("/checkout/callback"),
      );
      expect(link, "the receipt must contain an order link").toBeTruthy();

      const parsed = new URL(link!.replace(/^.*?(https?:\/\/)/, "$1"));
      expect(parsed.searchParams.get("orderId")).toBe(orderId);
      const token = parsed.searchParams.get("token");
      expect(token, "the receipt link must carry a signed token").toBeTruthy();
      // `<orderId>.<expiry>.<signature>` — the id it is scoped to is the first part.
      expect(token!.split(".")).toHaveLength(3);
      expect(token!.split(".")[0]).toBe(orderId);
    },
    240_000,
  );

  it(
    "lets a LOGGED-OUT visitor with the token view that one order — no session involved",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, {
        ip: uniqueTestIp(),
      });

      const orderId = await insertOrder({
        userId: user.id,
        phone: "09191234567",
        totalToman: 2_400_000,
      });

      // Settle the payment first (as the signed-in owner).
      const settled = await hitCallback(orderId, jar);
      expect(settled.status).toBe(200);
      expect(await orderStatus(orderId)).toBe("paid");

      // Now the real case: a genuinely logged-out browser holding only the
      // link. No cookie jar, no session — the token is the sole credential.
      const token = signOrderAccessToken(orderId);
      const response = await hitCallbackWithToken(orderId, token);

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Payment received");
      // The order's own data is rendered — proof the guard admitted THIS order.
      expect(html).toContain(orderId);
      expect(html).toContain(formatOrderAmountText(2_400_000));
    },
    240_000,
  );

  it(
    "refuses a token minted for a DIFFERENT order",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, {
        ip: uniqueTestIp(),
      });

      const mine = await insertOrder({
        userId: user.id,
        phone: "09191234567",
        totalToman: 700_000,
      });
      const theirs = await insertOrder({
        userId: user.id,
        phone: "09191234567",
        totalToman: 800_000,
      });

      // A token that legitimately authorises `theirs` must not open `mine`.
      const theirToken = signOrderAccessToken(theirs);
      const response = await hitCallbackWithToken(mine, theirToken);

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Unable to verify order");
      expect(html).not.toContain("Payment received");
      // The refused request must not have touched the order at all.
      expect(await orderStatus(mine)).toBe("pending");
    },
    240_000,
  );

  it(
    "refuses an expired token for a logged-out visitor",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, {
        ip: uniqueTestIp(),
      });

      const orderId = await insertOrder({
        userId: user.id,
        phone: "09191234567",
        totalToman: 600_000,
      });
      await hitCallback(orderId, jar);

      // Minted already expired — the signature is genuine, only the lifetime is up.
      const now = Date.now();
      const expired = signOrderAccessToken(orderId, {
        now: now - 60_000,
        ttlSeconds: 1,
      });

      const response = await hitCallbackWithToken(orderId, expired);

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("Unable to verify order");
    },
    240_000,
  );

  it(
    "still refuses a logged-out visitor with NO token — the session path is unchanged",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, {
        ip: uniqueTestIp(),
      });

      const orderId = await insertOrder({
        userId: user.id,
        phone: "09191234567",
        totalToman: 1_100_000,
      });

      const response = await hitCallbackAnonymous(orderId);

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("Unable to verify order");
      // Nothing was written: an unauthenticated request is inert.
      expect(await orderStatus(orderId)).toBe("pending");
    },
    240_000,
  );

  it(
    "lets a signed-in owner whose order was NOT matched by the token still in — the session fallback survives",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);
      const { jar } = await signInAs(user.email, user.password, {
        ip: uniqueTestIp(),
      });

      const orderId = await insertOrder({
        userId: user.id,
        phone: "09191234567",
        totalToman: 1_300_000,
      });

      // A junk token must not BREAK the session path — a logged-in owner
      // navigating in-app is not made worse by a bad query param.
      const response = await fetchPageWhenWarm(
        (await startAuthServer()).origin,
        `/en/checkout/callback?orderId=${orderId}&Authority=AUTH-${orderId}&Status=OK&token=clearly-not-valid`,
        jar,
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("Payment received");
      expect(await orderStatus(orderId)).toBe("paid");
    },
    240_000,
  );

  it(
    "never sends to a phone-account's synthetic email address",
    async () => {
      const user = await registerUser();
      createdUsers.push(user);

      // Sign in FIRST — the email is rewritten below, and the session must be
      // established against the credentials that actually exist.
      const { jar } = await signInAs(user.email, user.password, {
        ip: uniqueTestIp(),
      });

      // Reproduce what better-auth does for a phone-only sign-up: the address
      // is present but cannot receive mail. The local part is randomised
      // because `user.email` is unique and this row outlives a single run.
      await query(`UPDATE "user" SET email = $1 WHERE id = $2`, [
        `${randomUUID()}@phone.ako-light.local`,
        user.id,
      ]);

      // No usable phone on the order either, so there is no channel at all.
      const orderId = await insertOrder({
        userId: user.id,
        phone: "",
        totalToman: 500_000,
      });

      const smsBefore = deliveredBulkSms.length;
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const response = await hitCallback(orderId, jar);
        expect(response.status).toBe(200);

        // The payment still succeeds — a missing channel must never break the
        // confirmation page.
        expect(await orderStatus(orderId)).toBe("paid");
        expect(
          deliveredBulkSms.length - smsBefore,
          "nothing may be sent to the synthetic address",
        ).toBe(0);
      } finally {
        errorSpy.mockRestore();
      }
    },
    240_000,
  );
});
