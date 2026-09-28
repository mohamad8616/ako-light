/**
 * Pass 11.5A — Step 2: phone / SMS OTP authentication.
 *
 * Drives the real HTTP surface (`app/api/auth/[...all]` → better-auth's
 * phone-number plugin) through the in-process Next server from
 * tests/helpers/auth-db.ts. The plugin is configured in lib/auth/auth.ts
 * (otpLength 6, expiresIn 300, allowedAttempts 3, signUpOnVerification).
 *
 * No SMS provider is contacted. `startAuthServer()` strips SMSIR_API_KEY from
 * the process environment before the app boots, which makes lib/auth/sms.ts
 * take its no-network dev-mock branch. The generated code is then read back
 * from the `verification` table (`value = "<code>:<attempts>"`), so the full
 * send → verify flow runs against the genuine plugin code with a real,
 * persisted code — no gateway, no real message.
 *
 * A different client IP (`x-forwarded-for`) is used per case because the
 * plugin rate-limits `/phone-number*` to 10 requests / 60s per (ip|path);
 * without that the suite would trip on its own traffic rather than on the
 * behaviour under test.
 *
 * The tier is the `auth` Vitest project (vitest.config.ts). Existing files are
 * untouched.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CookieJar,
  authRequest,
  cleanupFixture,
  closeDb,
  deleteOtp,
  expireStoredOtp,
  findOtpRows,
  findUser,
  hasDatabaseUrl,
  otpTtlSeconds,
  requestOtp,
  registerViaPhone,
  startAuthServer,
  stopAuthServer,
  sweepRunRows,
  uniquePhoneE164,
  uniqueTestIp,
} from "@/tests/helpers/auth-db";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

/** Phone numbers this file created, removed in `afterAll`. */
const phones: string[] = [];

async function sendOtp(phoneNumber: string) {
  return authRequest<{ message?: string }>("/phone-number/send-otp", {
    json: { phoneNumber },
    ip: uniqueTestIp(),
  });
}

function verifyOtp(
  phoneNumber: string,
  code: string,
  extra: Record<string, unknown> = {},
) {
  return authRequest<{
    status?: boolean;
    token?: string | null;
    user?: { id?: string; phoneNumber?: string; phoneNumberVerified?: boolean };
  }>("/phone-number/verify", {
    json: { phoneNumber, code, ...extra },
    ip: uniqueTestIp(),
  });
}

describeAuth("phone / SMS OTP authentication", () => {
  beforeAll(async () => {
    await startAuthServer();
  });

  afterAll(async () => {
    await cleanupFixture({ phoneNumbers: phones });
    await sweepRunRows();
    await stopAuthServer();
    await closeDb();
  });

  /* ---------------------------------------------------------------------- */
  /* OTP request                                                            */
  /* ---------------------------------------------------------------------- */

  it("sends an OTP and persists exactly one verification row", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const response = await sendOtp(phoneNumber);

    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const rows = await findOtpRows(phoneNumber);
    expect(rows, "send-otp must store exactly one verification row").toHaveLength(1);

    // Stored as `<code>:<attempts>`, attempts starting at 0.
    const [code, attempts] = rows[0].value.split(":");
    expect(code, "stored OTP must be 6 digits").toMatch(/^\d{6}$/);
    expect(attempts).toBe("0");

    // expiresIn: 300. The span is measured between the row's own two
    // `timestamp` columns rather than against Date.now(), which would mix two
    // different representations of "now" (see otpTtlSeconds).
    expect(otpTtlSeconds(rows[0]), "OTP must live for expiresIn: 300 seconds").toBe(300);
  });

  it("never returns the OTP code in the send-otp response", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const response = await sendOtp(phoneNumber);
    const code = await requestOtpCodeFromDb(phoneNumber);

    // The code must not travel back over the wire, in any field.
    expect(JSON.stringify(response.body)).not.toContain(code);
    expect(response.body).not.toHaveProperty("code");
    expect(response.body).not.toHaveProperty("otp");
    // The provider's message is opaque; it must not embed the digits either.
    expect(String(response.body?.message ?? "")).not.toContain(code);
  });

  /* ---------------------------------------------------------------------- */
  /* Successful verification                                                */
  /* ---------------------------------------------------------------------- */

  it("verifies a correct OTP and creates a session", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const code = await requestOtp(phoneNumber);
    const jar = new CookieJar();

    const response = await authRequest<{
      status?: boolean;
      token?: string | null;
      user?: { id?: string; phoneNumber?: string; phoneNumberVerified?: boolean };
    }>("/phone-number/verify", {
      json: { phoneNumber, code },
      jar,
      ip: uniqueTestIp(),
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body?.status).toBe(true);
    expect(response.body?.token, "verify must mint a session token").toBeTruthy();
    expect(response.body?.user?.phoneNumber).toBe(phoneNumber);
    expect(response.body?.user?.phoneNumberVerified).toBe(true);

    // Session cookie is the transport half of "a session was created".
    const cookieNames = jar.names();
    expect(
      cookieNames.some((name) => name.includes("session_token")),
      `expected a session_token cookie, got: ${cookieNames.join(", ")}`,
    ).toBe(true);

    // The row is really in the database, and the phone is marked verified.
    const stored = await findUser(response.body?.user?.id as string);
    expect(stored, "user row must exist").not.toBeNull();
    expect(stored?.phoneNumber).toBe(phoneNumber);
    expect(stored?.phoneNumberVerified).toBe(true);
  });

  it("consumes the OTP row on successful verification", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const code = await requestOtp(phoneNumber);
    await verifyOtp(phoneNumber, code, { disableSession: true });

    expect(
      await findOtpRows(phoneNumber),
      "a used OTP must be deleted so it cannot be replayed",
    ).toHaveLength(0);
  });

  it("authenticates an existing user on a subsequent OTP login", async () => {
    // First login creates the account…
    const first = await registerViaPhone();
    phones.push(first.phoneNumber);

    // …second cycle must log the SAME user in, not create a duplicate.
    const code = await requestOtp(first.phoneNumber);
    const jar = new CookieJar();
    const response = await authRequest<{ user?: { id?: string } }>("/phone-number/verify", {
      json: { phoneNumber: first.phoneNumber, code },
      jar,
      ip: uniqueTestIp(),
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body?.user?.id, "the same user id must come back").toBe(first.id);

    // A real session now exists for that user.
    const session = await authRequest<{ user?: { id?: string } } | null>("/get-session", { jar });
    expect(session.status).toBe(200);
    expect(session.body?.user?.id).toBe(first.id);
  });

  /* ---------------------------------------------------------------------- */
  /* Incorrect OTP                                                          */
  /* ---------------------------------------------------------------------- */

  it("rejects an incorrect OTP with INVALID_OTP and keeps the row", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const real = await requestOtp(phoneNumber);
    // Pick a wrong code that is definitely not the real one.
    const wrong = real === "000000" ? "111111" : "000000";

    const response = await verifyOtp(phoneNumber, wrong);

    expect(response.status).toBe(400);
    expect(response.error?.code).toBe("INVALID_OTP");

    // A within-budget failure must NOT consume the code — the user can retry.
    const rows = await findOtpRows(phoneNumber);
    expect(rows, "the OTP row must survive a within-budget failure").toHaveLength(1);
    const [, attempts] = rows[0].value.split(":");
    expect(attempts, "the failed attempt must be counted").toBe("1");
  });

  /* ---------------------------------------------------------------------- */
  /* Expired OTP                                                            */
  /* ---------------------------------------------------------------------- */

  it("rejects an expired OTP with OTP_EXPIRED", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const code = await requestOtp(phoneNumber);
    // Move the stored expiry into the past instead of waiting five minutes.
    await expireStoredOtp(phoneNumber);

    const response = await verifyOtp(phoneNumber, code);

    expect(response.status).toBe(400);
    expect(response.error?.code).toBe("OTP_EXPIRED");

    // The plugin deletes an expired row on the rejected verify.
    expect(await findOtpRows(phoneNumber)).toHaveLength(0);
  });

  /* ---------------------------------------------------------------------- */
  /* Reused OTP                                                             */
  /* ---------------------------------------------------------------------- */

  it("rejects a replayed OTP once it has been consumed", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const code = await requestOtp(phoneNumber);

    const first = await verifyOtp(phoneNumber, code, { disableSession: true });
    expect(first.status, JSON.stringify(first.body)).toBe(200);

    // Replaying the exact same code must fail — the row is gone.
    const replay = await verifyOtp(phoneNumber, code, { disableSession: true });
    expect(replay.status).toBe(400);
    // With the row deleted the plugin reports OTP_NOT_FOUND.
    expect(replay.error?.code).toBe("OTP_NOT_FOUND");
  });

  /* ---------------------------------------------------------------------- */
  /* Maximum failed attempts                                                */
  /* ---------------------------------------------------------------------- */

  it("locks out after 3 wrong attempts with 403 TOO_MANY_ATTEMPTS", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const real = await requestOtp(phoneNumber);
    const wrong = real === "000000" ? "111111" : "000000";

    // Attempts 1-3 are within budget → 400 INVALID_OTP.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await verifyOtp(phoneNumber, wrong);
      expect(response.status, `attempt ${attempt} status`).toBe(400);
      expect(response.error?.code, `attempt ${attempt} code`).toBe("INVALID_OTP");
    }

    // The 4th is a distinct 403 and deletes the consumed code.
    const fourth = await verifyOtp(phoneNumber, wrong);
    expect(fourth.status, "4th attempt must be rate-limited").toBe(403);
    expect(fourth.error?.code).toBe("TOO_MANY_ATTEMPTS");

    expect(
      await findOtpRows(phoneNumber),
      "an exhausted OTP must be deleted",
    ).toHaveLength(0);

    // Even the CORRECT code is now dead — the user must request a new one.
    const correct = await verifyOtp(phoneNumber, real);
    expect(correct.status).not.toBe(200);
  });

  /* ---------------------------------------------------------------------- */
  /* OTP for the wrong phone / user                                         */
  /* ---------------------------------------------------------------------- */

  it("rejects a valid OTP presented for a different phone number", async () => {
    const owner = uniquePhoneE164();
    const attacker = uniquePhoneE164();
    phones.push(owner, attacker);

    const ownerCode = await requestOtp(owner);
    // The attacker has their own (different) code, or none — either way the
    // owner's code must not authenticate the attacker's number.
    await requestOtp(attacker);

    const response = await verifyOtp(attacker, ownerCode);

    expect(response.status, "cross-phone OTP must not verify").not.toBe(200);
    // The attacker's own row is untouched by the failed attempt.
    const attackerRows = await findOtpRows(attacker);
    expect(attackerRows, "the attacker's OTP row must still exist").toHaveLength(1);
  });

  it("rejects a correct code sent to the wrong phone", async () => {
    const phoneA = uniquePhoneE164();
    const phoneB = uniquePhoneE164();
    phones.push(phoneA, phoneB);

    // Codes exist for both; A's code must not verify B.
    const codeA = await requestOtp(phoneA);
    await requestOtp(phoneB);

    const response = await verifyOtp(phoneB, codeA);
    expect(response.status).not.toBe(200);

    // B's own code is still usable.
    const codeB = await requestOtpCodeFromDb(phoneB);
    const own = await verifyOtp(phoneB, codeB, { disableSession: true });
    expect(own.status, JSON.stringify(own.body)).toBe(200);
  });

  /* ---------------------------------------------------------------------- */
  /* Entry-point hardening                                                  */
  /* ---------------------------------------------------------------------- */

  it("rejects verification when no OTP was ever requested", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);
    await deleteOtp(phoneNumber);

    const response = await verifyOtp(phoneNumber, "123456");

    expect(response.status).toBe(400);
    expect(response.error?.code).toBe("OTP_NOT_FOUND");
  });

  /* ---------------------------------------------------------------------- */
  /* Successful authentication after a valid OTP (session + identity)       */
  /* ---------------------------------------------------------------------- */

  it("issues a session that authenticates later requests after a valid OTP", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const code = await requestOtp(phoneNumber);
    const jar = new CookieJar();
    const verify = await authRequest<{ user?: { id?: string } }>("/phone-number/verify", {
      json: { phoneNumber, code },
      jar,
      ip: uniqueTestIp(),
    });
    expect(verify.status, JSON.stringify(verify.body)).toBe(200);

    // The cookie authenticates a follow-up get-session…
    const session = await authRequest<{ user?: { id?: string; phoneNumber?: string } } | null>(
      "/get-session",
      { jar },
    );
    expect(session.status).toBe(200);
    expect(session.body?.user?.id).toBe(verify.body?.user?.id);

    // …and clearing it (sign-out) drops the session for real.
    const signOut = await authRequest("/sign-out", { json: {}, jar });
    expect(signOut.status).toBe(200);

    const after = await authRequest<unknown>("/get-session", { jar });
    expect(after.body, "get-session must be null after sign-out").toBeNull();
  });

  it("never leaks an OTP code in the verify response", async () => {
    const phoneNumber = uniquePhoneE164();
    phones.push(phoneNumber);

    const code = await requestOtp(phoneNumber);
    const response = await verifyOtp(phoneNumber, code, { disableSession: true });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain(code);
    expect(response.body).not.toHaveProperty("code");
    expect(response.body).not.toHaveProperty("otp");
  });
});

/** Reads the stored code without going through `requestOtp` (which re-sends). */
async function requestOtpCodeFromDb(phoneNumber: string): Promise<string> {
  const rows = await findOtpRows(phoneNumber);
  expect(rows, "an OTP row must exist to read a code from").not.toHaveLength(0);
  return rows[0].value.split(":")[0];
}
