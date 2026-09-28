/**
 * Pass 11.5A — Step 3: sessions.
 *
 * Verifies the session lifecycle against the real HTTP surface
 * (`app/api/auth/[...all]`) and the real `session` table:
 *
 *   1. a successful authentication creates a session row;
 *   2. an authenticated user can retrieve their own session;
 *   3. an unauthenticated caller has no valid session;
 *   4. logout invalidates the session (row deleted, cookie cleared);
 *   5. an invalid / expired session is rejected.
 *
 * Sessions are minted by genuinely signing in (the cookie better-auth issues is
 * HMAC-signed with BETTER_AUTH_SECRET — see tests/helpers/auth-db.ts), so every
 * assertion is about a real, verifiable session rather than a hand-built one.
 *
 * Part of the `auth` Vitest project (vitest.config.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authRequest,
  cleanupFixture,
  closeDb,
  findSessions,
  hasDatabaseUrl,
  registerUser,
  signInAs,
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

describeAuth("session lifecycle", () => {
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
  /* 1. successful authentication creates a session                        */
  /* ---------------------------------------------------------------------- */

  it("creates a session row when a user authenticates", async () => {
    const user = await makeUser();

    // Registration already signs the user in (Better Auth issues a session
    // cookie from `/sign-up/email`), so a baseline session exists. Clear it so
    // the assertion below is about the explicit sign-in alone.
    const { query } = await import("@/tests/helpers/auth-db");
    await query(`DELETE FROM session WHERE "userId" = $1`, [user.id]);
    expect(await findSessions(user.id), "no session should remain after clearing").toHaveLength(0);

    const { token } = await signInAs(user.email, user.password);

    const after = await findSessions(user.id);
    expect(after, "sign-in must create exactly one session").toHaveLength(1);
    // `/sign-in/email` returns the raw session token (better-auth returns
    // `token: session.token`), which is exactly the value stored on the row;
    // the cookie is a separate HMAC-signed wrapper around it. So the response
    // token must identify the row that was just created.
    expect(token).toBeTruthy();
    expect(after[0].token, "the returned token must match the stored row").toBe(token);
    expect(after[0].expiresAt.getTime(), "session must carry a future expiry").toBeGreaterThan(
      Date.now(),
    );
  });

  /* ---------------------------------------------------------------------- */
  /* 2. an authenticated user can retrieve their own session                */
  /* ---------------------------------------------------------------------- */

  it("lets an authenticated user retrieve their own session", async () => {
    const user = await makeUser();
    const { jar } = await signInAs(user.email, user.password);

    const session = await authRequest<{
      user?: { id?: string; email?: string };
      session?: { id?: string; userId?: string };
    } | null>("/get-session", { jar });

    expect(session.status).toBe(200);
    expect(session.body, "an authenticated caller must get their session").not.toBeNull();
    expect(session.body?.user?.id).toBe(user.id);
    expect(session.body?.user?.email).toBe(user.email);
    expect(session.body?.session?.userId).toBe(user.id);
    // The session payload must never carry credential material.
    expect(JSON.stringify(session.body)).not.toContain(user.password);
  });

  it("returns the same identity across repeated session reads", async () => {
    const user = await makeUser();
    const { jar } = await signInAs(user.email, user.password);

    const first = await authRequest<{ user?: { id?: string } } | null>("/get-session", { jar });
    const second = await authRequest<{ user?: { id?: string } } | null>("/get-session", { jar });

    expect(first.body?.user?.id).toBe(user.id);
    expect(second.body?.user?.id).toBe(user.id);
  });

  /* ---------------------------------------------------------------------- */
  /* 3. an unauthenticated caller has no valid session                      */
  /* ---------------------------------------------------------------------- */

  it("returns null session for a caller with no cookie", async () => {
    const session = await authRequest<unknown>("/get-session");
    expect(session.status).toBe(200);
    expect(session.body, "no cookie must resolve to no session").toBeNull();
  });

  /* ---------------------------------------------------------------------- */
  /* 4. logout invalidates the session                                      */
  /* ---------------------------------------------------------------------- */

  it("deletes the session row and clears the cookie on logout", async () => {
    const user = await makeUser();
    const { jar } = await signInAs(user.email, user.password);

    // Sanity: session is live. (Registration added one already, so a successful
    // sign-in brings the total to two.)
    const live = await authRequest<{ user?: { id?: string } } | null>("/get-session", { jar });
    expect(live.body?.user?.id).toBe(user.id);
    expect(await findSessions(user.id)).toHaveLength(2);

    const signOut = await authRequest("/sign-out", { json: {}, jar });
    expect(signOut.status, JSON.stringify(signOut.body)).toBe(200);

    // The signed-in session's row must be gone — only the registration
    // session (which this jar never held) remains.
    expect(await findSessions(user.id), "logout must delete the session row").toHaveLength(1);

    // And the cookie no longer authenticates.
    const after = await authRequest<unknown>("/get-session", { jar });
    expect(after.status).toBe(200);
    expect(after.body, "the cleared session must resolve to null").toBeNull();
  });

  /* ---------------------------------------------------------------------- */
  /* 5. invalid / expired sessions are rejected                             */
  /* ---------------------------------------------------------------------- */

  it("rejects a forged or malformed session cookie", async () => {
    const response = await authRequest<unknown>("/get-session", {
      headers: { cookie: "better-auth.session_token=not-a-real-token.forged-signature" },
    });

    expect(response.status).toBe(200);
    expect(response.body, "a forged token must resolve to no session").toBeNull();
  });

  it("rejects a session token that was deleted server-side", async () => {
    const user = await makeUser();
    const { jar } = await signInAs(user.email, user.password);

    // Session works…
    const before = await authRequest<{ user?: { id?: string } } | null>("/get-session", { jar });
    expect(before.body?.user?.id).toBe(user.id);

    // …then it is revoked out from under the client (as an admin or a
    // database cleanup would).
    const { query } = await import("@/tests/helpers/auth-db");
    await query(`DELETE FROM session WHERE "userId" = $1`, [user.id]);

    const after = await authRequest<unknown>("/get-session", { jar });
    expect(after.status).toBe(200);
    expect(after.body, "a revoked session must stop authenticating").toBeNull();
  });

  it("does not authenticate a session belonging to a deleted user", async () => {
    const user = await makeUser();
    const { jar } = await signInAs(user.email, user.password);

    const { query } = await import("@/tests/helpers/auth-db");
    await query(`DELETE FROM session WHERE "userId" = $1`, [user.id]);
    await query(`DELETE FROM account WHERE "userId" = $1`, [user.id]);
    await query(`DELETE FROM "user" WHERE id = $1`, [user.id]);

    const response = await authRequest<unknown>("/get-session", { jar });
    expect(response.status).toBe(200);
    expect(response.body, "a session for a deleted user must not resolve").toBeNull();
  });

  /* ---------------------------------------------------------------------- */
  /* Independent sessions                                                   */
  /* ---------------------------------------------------------------------- */

  it("keeps concurrent sessions for the same user independent", async () => {
    const user = await makeUser();
    const first = await signInAs(user.email, user.password, { ip: uniqueTestIp() });
    const second = await signInAs(user.email, user.password, { ip: uniqueTestIp() });

    // Registration contributes one session; two explicit sign-ins add two more.
    expect(await findSessions(user.id), "two sign-ins create two sessions").toHaveLength(3);

    // Signing one out must not revoke the other.
    await authRequest("/sign-out", { json: {}, jar: first.jar });

    const secondStill = await authRequest<{ user?: { id?: string } } | null>("/get-session", {
      jar: second.jar,
    });
    expect(secondStill.body?.user?.id, "the other session must survive").toBe(user.id);

    const firstGone = await authRequest<unknown>("/get-session", { jar: first.jar });
    expect(firstGone.body, "the signed-out session must be gone").toBeNull();
  });
});
