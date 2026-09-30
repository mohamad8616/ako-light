/**
 * Single-order access tokens — "view this ONE order, no login required".
 *
 * WHY THIS EXISTS
 *
 * The order receipt is delivered over SMS/email and opened on whatever device
 * happens to be at hand. Gating the confirmation page on the session cookie
 * that placed the order (`order.userId === session.user.id`) therefore fails
 * for the exact case the link is sent for: a different browser, a different
 * device, or a signed-out customer. The receipt's own link would land on
 * "Unable to verify order".
 *
 * So the receipt URL carries a bearer token instead: an HMAC-SHA256 signature
 * over `(orderId, expiresAt)`. Whoever holds the link can read that one order's
 * confirmation view. Nothing else.
 *
 * SCOPE — what a token CANNOT do (all deliberate):
 *
 *   - It is NOT a session. It is never set as a cookie and is never consulted
 *     by `lib/auth` or the Proxy, so it cannot authenticate a request to any
 *     other route, the admin surface, or the Better Auth endpoints.
 *   - It grants access to exactly ONE order — the id it was minted for. The
 *     signature covers the id, so swapping in another order id invalidates it.
 *   - It is read-only. It is only ever handed to the callback page's guard; no
 *     write path, and no admin capability, accepts it. The page's own writes
 *     (recording the ZarinPal verification result) happen AFTER the guard, for
 *     the order the token authorises — never for a different one.
 *
 * WHY A SIGNED VALUE AND NOT A `receiptToken` COLUMN
 *
 * A stored random token would need a migration, a backfill for existing orders,
 * and a row read on the receipt-send path. The order id is already an
 * unguessable uuid v4 and the HMAC makes it tamper-evident, so a stateless
 * signed value gives the same guarantee with no schema change and no state to
 * keep in sync. Revocation is not a requirement here: the token only exposes
 * data the same person was already sent, and it expires.
 *
 * FORMAT
 *
 *   `<orderId>.<expiresAtEpochSeconds>.<base64url(HMAC-SHA256)>`
 *
 * The signing input is exactly `<orderId>.<expiresAtEpochSeconds>`, which is
 * why every component is re-derived from the raw string parts before the MAC is
 * recomputed — never from parsed/normalised values that could disagree with
 * what was signed.
 *
 * KEY MATERIAL
 *
 * `ORDER_ACCESS_TOKEN_SECRET` when set, else `BETTER_AUTH_SECRET` (always
 * present — the app cannot boot without it). Fails CLOSED: with neither set,
 * `signOrderAccessToken` throws and `verifyOrderAccessToken` returns null, so an
 * unconfigured deployment can never mint or accept a token.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** How long a receipt link stays usable. */
export const ORDER_ACCESS_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Who is asking to view the order — used for logging and tests. */
export type OrderAccessActor =
  | { via: "session"; userId: string }
  | { via: "token" };

/**
 * Reads the signing key.
 *
 * Returns null when nothing is configured so callers can fail closed rather
 * than sign under an empty key.
 */
function resolveSecret(): string | null {
  const explicit = process.env.ORDER_ACCESS_TOKEN_SECRET;
  if (explicit && explicit.length > 0) return explicit;

  const fallback = process.env.BETTER_AUTH_SECRET;
  if (fallback && fallback.length > 0) return fallback;

  return null;
}

/** `base64url` without padding — URL-safe and shorter than hex. */
function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

/**
 * Recomputes the signature over the exact string that was signed.
 *
 * Kept separate from {@link signOrderAccessToken} so verification and signing
 * can never drift: both call this with the raw text form of the pair.
 */
function computeSignature(orderId: string, expiresAtSeconds: number, secret: string): string {
  const signingInput = `${orderId}.${expiresAtSeconds}`;
  return toBase64Url(createHmac("sha256", secret).update(signingInput).digest());
}

/**
 * Mints a token granting read access to one order.
 *
 * @param orderId           the order the token is scoped to
 * @param options.now       injectable clock (tests); defaults to `Date.now()`
 * @param options.ttlSeconds lifetime override; defaults to 30 days
 *
 * @throws when no signing key is configured — callers on the receipt path are
 *         best-effort and catch this, so the failure degrades a receipt to a
 *         session-gated link rather than breaking the confirmation page.
 */
export function signOrderAccessToken(
  orderId: string,
  options: { now?: number; ttlSeconds?: number } = {},
): string {
  if (!orderId) {
    throw new Error("signOrderAccessToken requires an order id.");
  }

  const secret = resolveSecret();
  if (!secret) {
    throw new Error(
      "Cannot sign an order access token: set ORDER_ACCESS_TOKEN_SECRET or BETTER_AUTH_SECRET.",
    );
  }

  const now = options.now ?? Date.now();
  const ttlSeconds = options.ttlSeconds ?? ORDER_ACCESS_TOKEN_TTL_SECONDS;
  const expiresAtSeconds = Math.floor(now / 1000) + ttlSeconds;

  return `${orderId}.${expiresAtSeconds}.${computeSignature(orderId, expiresAtSeconds, secret)}`;
}

/** Parsed, verified token contents. */
export type OrderAccessTokenClaims = {
  orderId: string;
  /** Unix seconds. */
  expiresAtSeconds: number;
};

/**
 * Verifies a token and returns its claims, or null when it is not acceptable.
 *
 * Null is returned for every rejection reason — malformed, bad signature,
 * expired, or no key configured — so a caller cannot accidentally treat one as
 * "valid but oddly shaped". The signature is compared in constant time.
 */
export function verifyOrderAccessToken(
  token: string | null | undefined,
  options: { now?: number } = {},
): OrderAccessTokenClaims | null {
  if (!token) return null;

  const secret = resolveSecret();
  if (!secret) return null;

  // Exactly three dot-separated parts. `slice` from the ends keeps a dot inside
  // the order id from being possible — uuids have none, and a malformed input
  // simply fails to parse.
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [orderId, expiresAtRaw, signature] = parts;
  if (!orderId || !expiresAtRaw || !signature) return null;

  // Reject anything that is not a plain integer before it reaches `Number`,
  // so `1e9`, `0x10` and `Infinity` cannot be smuggled in different forms.
  if (!/^\d{1,12}$/.test(expiresAtRaw)) return null;

  const expiresAtSeconds = Number(expiresAtRaw);

  const expected = computeSignature(orderId, expiresAtSeconds, secret);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  // `timingSafeEqual` throws on a length mismatch, so compare lengths first.
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  const now = options.now ?? Date.now();
  if (Math.floor(now / 1000) > expiresAtSeconds) return null;

  return { orderId, expiresAtSeconds };
}

/**
 * The single authorisation decision for viewing one order's confirmation view.
 *
 * Two independent paths are accepted, and they are checked in this order:
 *
 *   1. **Session + ownership** — a signed-in user viewing their own order. This
 *      is the in-app path and is unchanged from before the token existed.
 *   2. **Token** — a signed, unexpired token scoped to *this exact order id*.
 *      Deliberately does NOT require a session; that is the entire point.
 *
 * Returns the actor that was granted access, or null to refuse. Keeping the
 * whole decision here (rather than inline in the page) means the "one order,
 * read-only" property is expressed once and is unit-testable.
 */
export function authorizeOrderAccess({
  order,
  session,
  token,
  now,
}: {
  /** The order being requested; `null` when it does not exist. */
  order: { id: string; userId: string } | null;
  /** The active session user id, or null when signed out. */
  session: { userId: string } | null;
  /** The `?token=` query value, if any. */
  token?: string | null;
  /** Injectable clock for tests. */
  now?: number;
}): OrderAccessActor | null {
  if (!order) return null;

  // Fallback/alternative path: the same signed-in owner as before.
  if (session && order.userId === session.userId) {
    return { via: "session", userId: session.userId };
  }

  // The logged-out / different-device path. The token must name THIS order.
  const claims = verifyOrderAccessToken(token, now === undefined ? {} : { now });
  if (claims && claims.orderId === order.id) {
    return { via: "token" };
  }

  return null;
}
