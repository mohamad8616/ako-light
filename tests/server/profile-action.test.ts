/**
 * Pass C.2.2 — the password-change SERVER ACTION, invoked for real.
 *
 * ── What is real and what is stubbed ────────────────────────────────────────
 *
 * REAL: the action module itself, `@/lib/auth/auth` (the genuine better-auth
 * instance), the database, and the session cookie — which is minted by a real
 * `auth.api.signInEmail` call and is a genuine signed token, exactly what a
 * browser would hold.
 *
 * STUBBED: only Next's request context. `headers()` is pointed at that real
 * cookie, and `cookies()` is a recording store. That is unavoidable — a Server
 * Action reads the request through `next/headers`, which has no value outside a
 * Next request — but the cookie VALUE is real and the write is OBSERVED rather
 * than assumed.
 *
 * WHAT THIS DOES NOT PROVE: the HTTP transport of the replacement cookie. The
 * browser's receipt and replay of that Set-Cookie is only exercisable over real
 * HTTP, and that half is covered in
 * tests/integration/auth/profile.test.ts by driving `/api/auth/change-password`
 * through the in-process app. Together the two cover the path; neither alone
 * does. This file says so rather than claiming the transport was proven.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/* Next's request context — the only thing mocked                     */
/* ------------------------------------------------------------------ */

const state = vi.hoisted(() => ({
  /** The Cookie header the action will see (a real signed session token). */
  cookieHeader: "",
  /** Everything better-auth asked `cookies()` to write. */
  written: [] as { name: string; value: string }[],
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: state.cookieHeader }),
  cookies: async () => ({
    set: (name: string, value: string) => {
      state.written.push({ name, value });
    },
    get: (name: string) =>
      state.written.find((entry) => entry.name === name),
    delete: () => {},
  }),
}));

import {
  cleanupFixture,
  closeDb,
  hasDatabaseUrl,
  query,
  setUserFlags,
  uniqueEmail,
  uniqueTestIp,
} from "@/tests/helpers/auth-db";
import { changeOwnPasswordAction } from "@/lib/admin/actions/profile";
import { auth } from "@/lib/auth/auth";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const NEW_PASSWORD = "rotated-passphrase-c22-x";

const created: { id: string; email: string }[] = [];

/** Creates an account with `role` and returns a REAL signed session cookie. */
async function accountWithSession(
  role: "user" | "admin" | "owner",
): Promise<{ id: string; email: string; password: string; cookie: string }> {
  const email = uniqueEmail();
  const password = "correct-horse-battery-staple";

  const signedUp = await auth.api.signUpEmail({
    body: { email, password, name: email },
    // A unique IP per call keeps better-auth's rate limiter from bucketing
    // these together.
    headers: new Headers({ "x-forwarded-for": uniqueTestIp() }),
  });
  const id = (signedUp as { user?: { id?: string } }).user?.id;
  if (!id) throw new Error("sign-up returned no user id");
  created.push({ id, email });
  await setUserFlags(id, { role });

  const signedIn = await auth.api.signInEmail({
    body: { email, password },
    headers: new Headers({ "x-forwarded-for": uniqueTestIp() }),
    returnHeaders: true,
  });
  const cookie = signedIn.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error("sign-in returned no cookie");

  return { id, email, password, cookie };
}

/** True when `password` signs the account in, over the real auth API. */
async function passwordWorks(email: string, password: string): Promise<boolean> {
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: new Headers({ "x-forwarded-for": uniqueTestIp() }),
    });
    return true;
  } catch {
    return false;
  }
}

describeDb("changeOwnPasswordAction — the real action", () => {
  beforeEach(() => {
    state.cookieHeader = "";
    state.written.length = 0;
  });

  afterAll(async () => {
    await cleanupFixture({
      userIds: created.map((u) => u.id),
      emails: created.map((u) => u.email),
    });
    await closeDb();
  });

  /* ------------------------------------------------------------------ */
  /* Authorization                                                       */
  /* ------------------------------------------------------------------ */

  it("rejects an UNAUTHENTICATED call", async () => {
    const outcome = await changeOwnPasswordAction({
      currentPassword: "whatever",
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.formError).toBe("unknown");
  });

  it("rejects a CUSTOMER, even with a valid session", async () => {
    const customer = await accountWithSession("user");
    state.cookieHeader = customer.cookie;

    const outcome = await changeOwnPasswordAction({
      currentPassword: customer.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(outcome.ok, "a customer must not reach the staff action").toBe(false);
    // ...and nothing changed.
    expect(await passwordWorks(customer.email, customer.password)).toBe(true);
  });

  /* ------------------------------------------------------------------ */
  /* Validation — the shared policy, enforced server-side                */
  /* ------------------------------------------------------------------ */

  it("rejects a mismatched confirmation WITHOUT touching the password", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const outcome = await changeOwnPasswordAction({
      currentPassword: admin.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: `${NEW_PASSWORD}-different`,
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.issues.map((i) => i.code)).toContain("passwordMismatch");
    }
    expect(await passwordWorks(admin.email, admin.password)).toBe(true);
  });

  it("rejects a policy violation (too short)", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const outcome = await changeOwnPasswordAction({
      currentPassword: admin.password,
      newPassword: "short",
      confirmPassword: "short",
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.issues.map((i) => i.code)).toContain("tooShort");
    }
    expect(await passwordWorks(admin.email, admin.password)).toBe(true);
  });

  it("reports an INCORRECT current password as a typed field error", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const outcome = await changeOwnPasswordAction({
      currentPassword: "definitely-not-the-password",
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      // A controlled validation failure, not a thrown 500 — and the code is the
      // one the dictionary renders as "current password is incorrect".
      expect(outcome.formError).toBe("invalid");
      expect(outcome.issues).toEqual([
        { field: "currentPassword", code: "wrongPassword" },
      ]);
    }
    expect(await passwordWorks(admin.email, admin.password)).toBe(true);
  });

  /* ------------------------------------------------------------------ */
  /* The happy path — and the cookie it writes                           */
  /* ------------------------------------------------------------------ */

  it("changes an ADMIN's password and writes a replacement session cookie", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const outcome = await changeOwnPasswordAction({
      currentPassword: admin.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(outcome, JSON.stringify(outcome)).toMatchObject({ ok: true });

    // The change is REAL: the old password is gone, the new one works.
    expect(await passwordWorks(admin.email, admin.password)).toBe(false);
    expect(await passwordWorks(admin.email, NEW_PASSWORD)).toBe(true);

    // `revokeOtherSessions: true` makes better-auth issue a replacement for the
    // CALLING session. It wrote one — so the caller is not left signed out.
    expect(
      state.written.length,
      "the action must refresh the caller's session cookie",
    ).toBeGreaterThan(0);
    expect(state.written.some((entry) => entry.name.includes("session_token"))).toBe(
      true,
    );
  });

  it("changes an OWNER's password too", async () => {
    const owner = await accountWithSession("owner");
    state.cookieHeader = owner.cookie;

    const outcome = await changeOwnPasswordAction({
      currentPassword: owner.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(outcome, JSON.stringify(outcome)).toMatchObject({ ok: true });
    expect(await passwordWorks(owner.email, NEW_PASSWORD)).toBe(true);
  });

  /* ------------------------------------------------------------------ */
  /* No target, no leak                                                  */
  /* ------------------------------------------------------------------ */

  it("cannot change another account's password — there is no target field", async () => {
    const admin = await accountWithSession("admin");
    const bystander = await accountWithSession("user");
    state.cookieHeader = admin.cookie;

    // A forged payload with extra "target" fields is ignored: the action only
    // reads the three password fields and always operates on the session's own
    // account.
    const outcome = await changeOwnPasswordAction({
      currentPassword: admin.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
      // @ts-expect-error — deliberately forging fields the action must ignore.
      userId: bystander.id,
      targetUserId: bystander.id,
    });

    expect(outcome.ok).toBe(true);
    // The bystander is untouched.
    expect(await passwordWorks(bystander.email, bystander.password)).toBe(true);
    expect(await passwordWorks(bystander.email, NEW_PASSWORD)).toBe(false);
  });

  it("returns no password or token material in its result", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    const outcome = await changeOwnPasswordAction({
      currentPassword: admin.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    const serialized = JSON.stringify(outcome);
    expect(serialized).not.toContain(admin.password);
    expect(serialized).not.toContain(NEW_PASSWORD);
    // The replacement session token is written to the cookie jar, never returned.
    for (const entry of state.written) {
      expect(serialized).not.toContain(entry.value);
    }
  });

  it("keeps the credential hashed and never stores plaintext", async () => {
    const admin = await accountWithSession("admin");
    state.cookieHeader = admin.cookie;

    await changeOwnPasswordAction({
      currentPassword: admin.password,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    const rows = await query<{ password: string | null }>(
      `SELECT password FROM account WHERE "userId" = $1`,
      [admin.id],
    );
    expect(rows[0]?.password).toBeTruthy();
    expect(rows[0]!.password).not.toBe(NEW_PASSWORD);
  });
});
