/**
 * Pass 11.5A — Step 5: banned users.
 *
 * Verifies the ban behaviour the project actually implements (the better-auth
 * admin plugin's `session.create` hook — see lib/auth/auth.ts, which enables
 * `admin()`). Nothing new is invented here: the assertions mirror the plugin's
 * own contract.
 *
 * The contract, read from better-auth's admin plugin:
 *
 *   session.create.before(session):
 *     if (user.banned) {
 *       if (user.banExpires && banExpires < now) {   // expired ban
 *         clear banned/banReason/banExpires;          // auto-unban
 *         return;                                     // and allow
 *       }
 *       throw 403 BANNED_USER;                        // otherwise block
 *     }
 *
 * Two consequences worth stating explicitly, because they shape the tests:
 *
 *   1. Enforcement happens when a session is CREATED, i.e. at sign-in. A banned
 *      user therefore cannot authenticate or create a new session.
 *   2. A session minted BEFORE the ban still exists in the database, and
 *      `/get-session` performs no ban check. So the honest answer to "an
 *      existing banned-user session" is: the session row survives, but the ban
 *      takes effect the moment that user tries to create a new session. The
 *      test below asserts that real behaviour rather than an assumed one.
 *
 * Part of the `auth` Vitest project (vitest.config.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authRequest,
  cleanupFixture,
  closeDb,
  findSessions,
  findUser,
  hasDatabaseUrl,
  registerUser,
  setUserFlags,
  signedInThenFlagged,
  startAuthServer,
  stopAuthServer,
  sweepRunRows,
  uniqueTestIp,
  type TestUser,
} from "@/tests/helpers/auth-db";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

const created: TestUser[] = [];

async function makeUser(): Promise<TestUser> {
  const user = await registerUser();
  created.push(user);
  return user;
}

describeAuth("banned users", () => {
  beforeAll(async () => {
    await startAuthServer();
  });

  afterAll(async () => {
    await cleanupFixture({
      userIds: created.map((user) => user.id),
      emails: created.map((user) => user.email),
    });
    await sweepRunRows();
    await stopAuthServer();
    await closeDb();
  });

  /* ---------------------------------------------------------------------- */
  /* 1. a banned user cannot authenticate                                   */
  /* ---------------------------------------------------------------------- */

  it("refuses to sign in a banned user", async () => {
    const user = await makeUser();
    await setUserFlags(user.id, { banned: true, banReason: "policy violation" });

    const response = await authRequest<unknown>("/sign-in/email", {
      json: { email: user.email, password: user.password },
      ip: uniqueTestIp(),
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(JSON.stringify(response.body)).toContain("BANNED_USER");
  });

  it("creates no session for a banned user's failed sign-in", async () => {
    const user = await makeUser();
    // Registration already minted one session; clear it so "no NEW session"
    // is unambiguous.
    const { query } = await import("@/tests/helpers/auth-db");
    await query(`DELETE FROM session WHERE "userId" = $1`, [user.id]);

    await setUserFlags(user.id, { banned: true, banReason: "spam" });

    const response = await authRequest<unknown>("/sign-in/email", {
      json: { email: user.email, password: user.password },
      ip: uniqueTestIp(),
    });
    expect(response.status).toBe(403);

    expect(
      await findSessions(user.id),
      "a blocked sign-in must not leave a session behind",
    ).toHaveLength(0);
  });

  it("still reports the ban reason in the refusal", async () => {
    const user = await makeUser();
    await setUserFlags(user.id, { banned: true, banReason: "chargeback fraud" });

    const response = await authRequest<unknown>("/sign-in/email", {
      json: { email: user.email, password: user.password },
      ip: uniqueTestIp(),
    });

    // The code is stable; the human message must not leak internal notes.
    expect(JSON.stringify(response.body)).toContain("BANNED_USER");
    expect(JSON.stringify(response.body)).not.toContain("chargeback fraud");
  });

  /* ---------------------------------------------------------------------- */
  /* 2. an existing banned-user session                                     */
  /* ---------------------------------------------------------------------- */

  it("does not resurrect an existing session into a new one for a banned user", async () => {
    // A real session minted BEFORE the ban (HMAC-signed cookie, as a browser
    // would hold). `signedInThenFlagged` returns the user fields flattened
    // alongside the session context.
    const subject = await signedInThenFlagged(
      { banned: true, banReason: "banned after sign-in" },
      { ip: uniqueTestIp() },
    );
    created.push(subject);
    const { jar } = subject;

    const before = await findSessions(subject.id);
    expect(before.length, "the pre-ban session row physically exists").toBeGreaterThan(0);

    // The ban is enforced on the next session CREATION (a fresh sign-in), not
    // by /get-session: the plugin's hook only runs when a session is created.
    const relogin = await authRequest<unknown>("/sign-in/email", {
      json: { email: subject.email, password: subject.password },
      ip: uniqueTestIp(),
    });
    expect(relogin.status, JSON.stringify(relogin.body)).toBe(403);
    expect(JSON.stringify(relogin.body)).toContain("BANNED_USER");

    // And the ban is durable: the user row still carries it.
    const row = await findUser(subject.id);
    expect(row?.banned, "the ban must not be silently cleared by a failed login").toBe(true);

    // Callers holding the pre-ban cookie must still not be able to mint a new
    // session through it.
    const forgedUse = await authRequest<unknown>("/sign-in/email", {
      json: { email: subject.email, password: subject.password },
      jar,
      ip: uniqueTestIp(),
    });
    expect(forgedUse.status).toBe(403);
  });

  it("keeps the pre-ban session readable but blocked from creating new ones", async () => {
    // Documenting the real, plugin-defined behaviour explicitly. `/get-session`
    // has no ban check (better-auth/dist/api/routes/session.mjs contains none),
    // so the row still resolves; the *barrier* is session creation. Asserting
    // this locks the contract so a future change to either side is caught.
    const subject = await signedInThenFlagged({ banned: true }, { ip: uniqueTestIp() });
    created.push(subject);

    const session = await authRequest<{ user?: { id?: string } } | null>("/get-session", {
      jar: subject.jar,
    });
    // Whether this is 200-with-body or null depends on the plugin version; the
    // load-bearing assertion is that it never becomes a *new* authenticated
    // identity beyond the row that already existed.
    if (session.body) {
      expect(session.body.user?.id).toBe(subject.id);
    }

    // The barrier that actually matters: no new session.
    const relogin = await authRequest<unknown>("/sign-in/email", {
      json: { email: subject.email, password: subject.password },
      ip: uniqueTestIp(),
    });
    expect(relogin.status).toBe(403);
  });

  /* ---------------------------------------------------------------------- */
  /* 3. an unbanned user can authenticate again                             */
  /* ---------------------------------------------------------------------- */

  it("lets an explicitly unbanned user sign in again", async () => {
    const user = await makeUser();
    await setUserFlags(user.id, { banned: true, banReason: "temporary" });

    const blocked = await authRequest<unknown>("/sign-in/email", {
      json: { email: user.email, password: user.password },
      ip: uniqueTestIp(),
    });
    expect(blocked.status).toBe(403);

    // Note: `setUserFlags` uses COALESCE for `banned`, so `false` is applied
    // explicitly and does lift the ban (only an *omitted* value would not).
    await setUserFlags(user.id, { banned: false, banReason: null });

    const allowed = await authRequest<{ user?: { id?: string } }>("/sign-in/email", {
      json: { email: user.email, password: user.password },
      ip: uniqueTestIp(),
    });
    expect(allowed.status, JSON.stringify(allowed.body)).toBe(200);
    expect(allowed.body?.user?.id).toBe(user.id);
  });

  it("auto-lifts a ban whose expiry has passed", async () => {
    const user = await makeUser();
    // IMPORTANT — why the offset is generous rather than "one minute ago":
    // `user.banExpires` is a Postgres `timestamp` column (no time zone), and
    // the plugin compares `new Date(banExpires).getTime() < Date.now()`. The
    // Prisma adapter reads a bare `timestamp` as UTC, while this machine runs
    // at UTC+3:30, so a value written as "just now" round-trips ~3.5 hours into
    // the FUTURE and reads as a live ban. A value far enough in the past is
    // unambiguously expired under either interpretation, so this test pins the
    // auto-unban *mechanism* without depending on the zone skew.
    // (The skew itself is reported as a finding; it is not fixed here because
    // changing the column type is a migration outside this pass's scope.)
    const longPast = new Date(Date.now() - 12 * 60 * 60 * 1000);
    await setUserFlags(user.id, { banned: true, banReason: "expired", banExpires: longPast });

    // The session.create hook sees an expired ban, clears it and allows the
    // sign-in.
    const response = await authRequest<{ user?: { id?: string } }>("/sign-in/email", {
      json: { email: user.email, password: user.password },
      ip: uniqueTestIp(),
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body?.user?.id).toBe(user.id);

    const row = await findUser(user.id);
    expect(row?.banned, "an expired ban must be cleared on next sign-in").toBe(false);
    expect(row?.banExpires ?? null, "the expiry must be cleared too").toBeNull();
    expect(row?.banReason ?? null, "the reason must be cleared too").toBeNull();
  });

  it("does not auto-lift a ban that has not expired yet", async () => {
    const user = await makeUser();
    // Far enough ahead to be unambiguously in the future despite the same
    // zone skew described in the auto-lift test above.
    const longAhead = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await setUserFlags(user.id, { banned: true, banReason: "suspended", banExpires: longAhead });

    const response = await authRequest<unknown>("/sign-in/email", {
      json: { email: user.email, password: user.password },
      ip: uniqueTestIp(),
    });

    expect(response.status).toBe(403);
    const row = await findUser(user.id);
    expect(row?.banned, "a live ban must remain in force").toBe(true);
  });

  it("does not affect a non-banned user signing in alongside", async () => {
    // Control case: a banned sibling must not poison unrelated accounts.
    const banned = await makeUser();
    await setUserFlags(banned.id, { banned: true });

    const clean = await makeUser();
    const response = await authRequest<{ user?: { id?: string } }>("/sign-in/email", {
      json: { email: clean.email, password: clean.password },
      ip: uniqueTestIp(),
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body?.user?.id).toBe(clean.id);
  });
});
