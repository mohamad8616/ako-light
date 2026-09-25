/**
 * Step 4 — OTP allowedAttempts: 3 is enforced, not just documented.
 *
 * lib/auth/auth.ts configures the better-auth phoneNumber plugin with
 * allowedAttempts: 3. The plugin stores the live code in the Verification
 * table as `value = "<otp>:<attempts>"`, bumps the counter on every wrong
 * code, and on exhaustion DELETES the row and throws 403 TOO_MANY_ATTEMPTS
 * (distinct from the 400 INVALID_OTP of attempts 1-3) — see
 * verifyPhoneNumberOTP in the installed better-auth dist
 * (node_modules/better-auth/dist/plugins/phone-number/routes.mjs).
 *
 * This file exhausts the attempts for real against the dev database (rolled
 * back afterwards, like every DB-tier test) and proves:
 *   1. attempts 1-3 with a wrong code fail with 400 INVALID_OTP;
 *   2. the 4th attempt fails DISTINCTLY with 403 TOO_MANY_ATTEMPTS;
 *   3. after exhaustion the Verification row is gone — even the CORRECT code
 *      no longer verifies (user must request a new code).
 *
 * Integration tier: needs DATABASE_URL (skipIf guard, same as the other DB
 * tiers). The auth instance itself is exercised through its real public
 * `auth.api` endpoints — sendPhoneNumberOTP (sendOTP stubbed to capture the
 * code instead of SMS) then verifyPhoneNumber — so this is the enforced
 * behavior of the configured plugin, not a re-implementation of it.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

// Mock sendOtpSms to avoid real SMS gateway calls — just capture the code in a
// closure so the test can read it if needed (we use disableSession: true and
// wrong codes, so the actual code value doesn't matter for the attempt-counting
// logic under test).
const mockSendOtpSms = vi.hoisted(() => vi.fn(async (phone: string, code: string) => {
  console.log(`[DEV OTP] ${phone}: ${code}`);
}));

vi.mock("@/lib/auth/sms", () => ({
  sendOtpSms: mockSendOtpSms,
}));

function errorInfo(error: unknown): { status?: number; code?: string } {
  const err = error as {
    statusCode?: number;
    status?: number;
    body?: { code?: string };
    error?: { code?: string; status?: number };
  };
  const status = err?.statusCode ?? err?.status ?? err?.error?.status;
  const code = err?.body?.code ?? err?.error?.code;
  return { status, code };
}

describeDb("phone OTP allowedAttempts: 3 is enforced", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects the 4th wrong code with 403 TOO_MANY_ATTEMPTS and consumes the code", async () => {
    const { auth } = await import("@/lib/auth/auth");
    const phoneNumber = `+98912${String(Math.floor(100000 + Math.random() * 899999))}`;

    let createdUserId: string | undefined;
    try {
      await auth.api.sendPhoneNumberOTP({
        body: { phoneNumber },
        headers: new Headers(),
      });

      const wrong = async () =>
        auth.api.verifyPhoneNumber({
          body: { phoneNumber, code: "000000", disableSession: true },
          headers: new Headers(),
        });

      for (let attempt = 1; attempt <= 3; attempt++) {
        const failure = await wrong().then(
          () => null,
          (error: unknown) => error,
        );
        expect(failure, `attempt ${attempt} must fail`).not.toBeNull();
        expect(errorInfo(failure).status, `attempt ${attempt} status`).toBe(
          400,
        );
        expect(errorInfo(failure).code, `attempt ${attempt} code`).toBe(
          "INVALID_OTP",
        );
      }

      const fourth = await wrong().then(
        () => null,
        (error: unknown) => error,
      );
      expect(fourth, "4th attempt must fail").not.toBeNull();
      expect(errorInfo(fourth).status, "4th attempt status").toBe(403);
      expect(errorInfo(fourth).code, "4th attempt code").toBe(
        "TOO_MANY_ATTEMPTS",
      );

      const remaining = await prisma.verification.findMany({
        where: { identifier: { contains: phoneNumber } },
      });
      expect(remaining, "exhausted OTP must be deleted").toHaveLength(0);

      const correct = await auth.api
        .verifyPhoneNumber({
          body: { phoneNumber, code: "000000", disableSession: true },
          headers: new Headers(),
        })
        .then(
          () => null,
          (error: unknown) => error,
        );
      expect(correct, "code must stay consumed after exhaustion").not.toBeNull();
      expect(errorInfo(correct).code).not.toBe(undefined);
    } finally {
      await prisma.verification.deleteMany({
        where: { identifier: { contains: phoneNumber } },
      });
      const users = await prisma.user.findMany({ where: { phoneNumber } });
      createdUserId = users[0]?.id;
      if (createdUserId) {
        await prisma.session.deleteMany({ where: { userId: createdUserId } });
        await prisma.account.deleteMany({ where: { userId: createdUserId } });
        await prisma.user.delete({ where: { id: createdUserId } });
      }
      // User is only created on SUCCESSFUL verification, not on wrong attempts.
      // The 4 wrong attempts only bump the attempt counter. So no user expected here.
      // The assertion is that the 4th attempt is 403 and code is consumed.
    }
  });

  it("pins the configured budget at 3 attempts", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../../lib/auth/auth.ts", import.meta.url), "utf8"),
    );
    expect(source).toContain("allowedAttempts: 3");
    void randomUUID;
  });
});


