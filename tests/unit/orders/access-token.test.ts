/**
 * Signed single-order access tokens (lib/orders/access-token.ts).
 *
 * The security properties of the receipt link are asserted here rather than
 * inferred from the page's behaviour: a token must only ever authorise the ONE
 * order it was minted for, must expire, must not be forgeable, and must never
 * stand in for a session. Those are exactly the claims a reviewer would want
 * disproved, so each gets a test that tries to break it.
 *
 * Pure — no database, no network. `now` is injected so the expiry boundary is
 * exact rather than timing-dependent.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ORDER_ACCESS_TOKEN_TTL_SECONDS,
  authorizeOrderAccess,
  signOrderAccessToken,
  verifyOrderAccessToken,
} from "@/lib/orders/access-token";

const ORDER_ID = "3f1d0a2e-9c4b-4a77-8f11-2b6c5d7e9a01";
const OTHER_ORDER_ID = "8b2e4c6a-1d3f-4b90-a2c4-6e8f0a1b3c5d";

/** Deterministic clock so expiry assertions are exact. */
const NOW = Date.UTC(2026, 8, 30, 12, 0, 0);

const previousEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  previousEnv.ORDER_ACCESS_TOKEN_SECRET = process.env.ORDER_ACCESS_TOKEN_SECRET;
  previousEnv.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
  process.env.ORDER_ACCESS_TOKEN_SECRET = "unit-test-signing-key";
  delete process.env.BETTER_AUTH_SECRET;
});

afterEach(() => {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("signOrderAccessToken / verifyOrderAccessToken", () => {
  it("round-trips an order id and expiry", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW });
    const claims = verifyOrderAccessToken(token, { now: NOW });

    expect(claims).not.toBeNull();
    expect(claims?.orderId).toBe(ORDER_ID);
    expect(claims?.expiresAtSeconds).toBe(
      Math.floor(NOW / 1000) + ORDER_ACCESS_TOKEN_TTL_SECONDS,
    );
  });

  it("mints an opaque three-part token that does not leak a signature of the raw id", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW });
    const parts = token.split(".");

    expect(parts).toHaveLength(3);
    // The id is carried in the clear (it is already unguessable and the page
    // needs it); the signature must not simply be the id re-encoded.
    expect(parts[0]).toBe(ORDER_ID);
    expect(parts[2]).not.toContain(ORDER_ID);
    expect(parts[2].length).toBeGreaterThan(32);
  });

  it("accepts a token right up to its expiry second and rejects it after", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW, ttlSeconds: 60 });
    const expiresAt = Math.floor(NOW / 1000) + 60;

    // Exactly at the expiry second is still valid…
    expect(verifyOrderAccessToken(token, { now: expiresAt * 1000 })).not.toBeNull();
    // …one second later is not.
    expect(
      verifyOrderAccessToken(token, { now: (expiresAt + 1) * 1000 }),
    ).toBeNull();
  });

  it("rejects a token that has expired", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW, ttlSeconds: 1 });
    expect(verifyOrderAccessToken(token, { now: NOW + 5_000 })).toBeNull();
  });

  it("rejects a token whose order id was swapped for another one", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW });
    const [, expiry, signature] = token.split(".");
    const tampered = `${OTHER_ORDER_ID}.${expiry}.${signature}`;

    expect(verifyOrderAccessToken(tampered, { now: NOW })).toBeNull();
  });

  it("rejects a token whose expiry was pushed out", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW, ttlSeconds: 60 });
    const [orderId, , signature] = token.split(".");
    const extended = Math.floor(NOW / 1000) + 60 * 60 * 24 * 365;
    const tampered = `${orderId}.${extended}.${signature}`;

    expect(verifyOrderAccessToken(tampered, { now: NOW })).toBeNull();
  });

  it("rejects a token signed with a different key", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW });

    process.env.ORDER_ACCESS_TOKEN_SECRET = "a-different-key";
    expect(verifyOrderAccessToken(token, { now: NOW })).toBeNull();
  });

  it("rejects malformed tokens without throwing", () => {
    const malformed = [
      "",
      "not-a-token",
      "only.two",
      "a.b.c.d",
      `${ORDER_ID}..`,
      `${ORDER_ID}.${Math.floor(NOW / 1000)}.`,
      "..",
      `${ORDER_ID}.1e9.abc`,
      `${ORDER_ID}.0x10.abc`,
      `${ORDER_ID}.Infinity.abc`,
      `${ORDER_ID}.-5.abc`,
      `${ORDER_ID}.${Math.floor(NOW / 1000)}.%%%not-base64%%%`,
    ];

    for (const token of malformed) {
      expect(() => verifyOrderAccessToken(token, { now: NOW })).not.toThrow();
      expect(verifyOrderAccessToken(token, { now: NOW })).toBeNull();
    }
  });

  it("returns null for null and undefined input", () => {
    expect(verifyOrderAccessToken(null, { now: NOW })).toBeNull();
    expect(verifyOrderAccessToken(undefined, { now: NOW })).toBeNull();
  });

  it("throws rather than signing when no key is configured", () => {
    delete process.env.ORDER_ACCESS_TOKEN_SECRET;
    delete process.env.BETTER_AUTH_SECRET;

    expect(() => signOrderAccessToken(ORDER_ID, { now: NOW })).toThrow(
      /ORDER_ACCESS_TOKEN_SECRET or BETTER_AUTH_SECRET/,
    );
  });

  it("fails closed on verification when no key is configured", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW });

    delete process.env.ORDER_ACCESS_TOKEN_SECRET;
    delete process.env.BETTER_AUTH_SECRET;

    expect(verifyOrderAccessToken(token, { now: NOW })).toBeNull();
  });

  it("falls back to BETTER_AUTH_SECRET when the dedicated var is unset", () => {
    delete process.env.ORDER_ACCESS_TOKEN_SECRET;
    process.env.BETTER_AUTH_SECRET = "session-secret-fallback";

    const token = signOrderAccessToken(ORDER_ID, { now: NOW });
    expect(verifyOrderAccessToken(token, { now: NOW })?.orderId).toBe(ORDER_ID);
  });

  it("prefers the dedicated secret over BETTER_AUTH_SECRET", () => {
    process.env.ORDER_ACCESS_TOKEN_SECRET = "dedicated";
    process.env.BETTER_AUTH_SECRET = "session-secret";

    const token = signOrderAccessToken(ORDER_ID, { now: NOW });

    // Only the dedicated key verifies it.
    expect(verifyOrderAccessToken(token, { now: NOW })).not.toBeNull();
    delete process.env.ORDER_ACCESS_TOKEN_SECRET;
    expect(verifyOrderAccessToken(token, { now: NOW })).toBeNull();
  });
});

describe("authorizeOrderAccess", () => {
  const order = { id: ORDER_ID, userId: "user-1" };

  it("grants a signed-in owner access via the session path", () => {
    const actor = authorizeOrderAccess({
      order,
      session: { userId: "user-1" },
      now: NOW,
    });

    expect(actor).toEqual({ via: "session", userId: "user-1" });
  });

  it("grants a logged-out holder of a valid token read access to that order", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW });

    const actor = authorizeOrderAccess({ order, session: null, token, now: NOW });

    expect(actor).toEqual({ via: "token" });
  });

  it("grants token access on a different device even with a session for another user", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW });

    const actor = authorizeOrderAccess({
      order,
      session: { userId: "someone-else" },
      token,
      now: NOW,
    });

    expect(actor).toEqual({ via: "token" });
  });

  it("refuses a signed-in user who does not own the order", () => {
    const actor = authorizeOrderAccess({
      order,
      session: { userId: "intruder" },
      now: NOW,
    });

    expect(actor).toBeNull();
  });

  it("refuses a token minted for a DIFFERENT order", () => {
    const token = signOrderAccessToken(OTHER_ORDER_ID, { now: NOW });

    const actor = authorizeOrderAccess({ order, session: null, token, now: NOW });

    expect(actor).toBeNull();
  });

  it("refuses an expired token when there is no session", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW, ttlSeconds: 1 });

    const actor = authorizeOrderAccess({
      order,
      session: null,
      token,
      now: NOW + 5_000,
    });

    expect(actor).toBeNull();
  });

  it("refuses a forged token", () => {
    const token = signOrderAccessToken(OTHER_ORDER_ID, { now: NOW });
    const [, expiry, signature] = token.split(".");
    const forged = `${ORDER_ID}.${expiry}.${signature}`;

    expect(
      authorizeOrderAccess({ order, session: null, token: forged, now: NOW }),
    ).toBeNull();
  });

  it("refuses when nobody is signed in and no token was supplied", () => {
    expect(
      authorizeOrderAccess({ order, session: null, now: NOW }),
    ).toBeNull();
    expect(
      authorizeOrderAccess({ order, session: null, token: "", now: NOW }),
    ).toBeNull();
  });

  it("refuses everything when the order does not exist", () => {
    const token = signOrderAccessToken(ORDER_ID, { now: NOW });

    expect(
      authorizeOrderAccess({ order: null, session: null, token, now: NOW }),
    ).toBeNull();
    expect(
      authorizeOrderAccess({
        order: null,
        session: { userId: "user-1" },
        now: NOW,
      }),
    ).toBeNull();
  });
});
