/**
 * Pass C.2 — the admin/owner profile page and password change.
 *
 * REAL HTTP through the in-process Next app: real sessions, real cookies, real
 * redirects. Nothing here asserts on source code.
 *
 * The password change is exercised through `/api/auth/change-password`, the
 * better-auth endpoint the server action delegates to (verified in the installed
 * 1.7.7: `POST /change-password`, guarded by `sensitiveSessionMiddleware`). That
 * is what proves the SESSION behaviour — that the old password stops working,
 * the new one starts, other sessions are revoked, and the caller's own session
 * survives.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authRequest,
  cleanupFixture,
  closeDb,
  fetchPageWhenWarm,
  hasDatabaseUrl,
  query,
  registerUser,
  setUserFlags,
  signInAs,
  startAuthServer,
  stopAuthServer,
  sweepRunRows,
  uniqueTestIp,
  type CookieJar,
  type TestUser,
} from "@/tests/helpers/auth-db";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

const created: TestUser[] = [];

const PROFILE_PATH = "/admin/profile";

/** Registers a user, forces `role`, then signs them in for real. */
async function signInAsRole(
  role: "user" | "admin" | "owner",
): Promise<{ user: TestUser; jar: CookieJar }> {
  const user = await registerUser();
  created.push(user);
  await setUserFlags(user.id, { role });
  const { jar } = await signInAs(user.email, user.password, {
    ip: uniqueTestIp(),
  });
  return { user, jar };
}

async function getPage(path: string, jar: CookieJar): Promise<Response> {
  const { origin } = await startAuthServer();
  return fetchPageWhenWarm(origin, path, jar);
}

/**
 * The same request with NO session cookie.
 *
 * A plain fetch, not `fetchPageWhenWarm`: the admin gate answers in the
 * middleware, before any route compiles, so there is no cold-cache 404 to retry
 * past — and `fetchPageWhenWarm` requires a jar.
 */
async function getPageSignedOut(path: string): Promise<Response> {
  const { origin } = await startAuthServer();
  return fetch(new URL(path, origin), { redirect: "manual" });
}

describeAuth("admin/owner profile — real HTTP surface", () => {
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

  /* ------------------------------------------------------------------ */
  /* Authorization                                                       */
  /* ------------------------------------------------------------------ */

  it("lets an ADMIN open their profile", async () => {
    const { jar } = await signInAsRole("admin");
    const response = await getPage(PROFILE_PATH, jar);
    expect(response.status, `admin got ${response.status}`).toBe(200);
  });

  it("lets an OWNER open their profile", async () => {
    const { jar } = await signInAsRole("owner");
    const response = await getPage(PROFILE_PATH, jar);
    expect(response.status, `owner got ${response.status}`).toBe(200);
  });

  it("does NOT let a CUSTOMER open it by typing the URL", async () => {
    const { jar } = await signInAsRole("user");
    const response = await getPage(PROFILE_PATH, jar);

    // requireAdminAccess redirects a non-admin to the localized sign-in page.
    // The status is 307 (or 200 for the sign-in page if a redirect was
    // followed) — what matters is that it is NOT the profile.
    expect([307, 302, 303]).toContain(response.status);
  });

  it("does NOT let an UNAUTHENTICATED visitor open it", async () => {
    const response = await getPageSignedOut(PROFILE_PATH);
    expect([307, 302, 303]).toContain(response.status);
  });

  it("resolves the same route under the Persian prefix", async () => {
    const { jar } = await signInAsRole("admin");
    const response = await getPage("/fa/admin/profile", jar);
    expect(response.status, `fa admin got ${response.status}`).toBe(200);
  });

  /* ------------------------------------------------------------------ */
  /* Content                                                             */
  /* ------------------------------------------------------------------ */

  it("shows the account's own details and no credential material", async () => {
    const { user, jar } = await signInAsRole("admin");
    const response = await getPage(PROFILE_PATH, jar);
    const html = await response.text();

    // The account's real data is rendered (asserted on unique row DATA, never
    // on dictionary copy embedded in the RSC payload).
    expect(html).toContain(user.email);

    // ...and no credential ever reaches the page.
    const rows = await query<{ password: string | null }>(
      `SELECT password FROM account WHERE "userId" = $1`,
      [user.id],
    );
    const hash = rows[0]?.password;
    expect(hash, "the fixture must have a credential hash").toBeTruthy();
    expect(html, "the password hash must never be rendered").not.toContain(
      hash!,
    );
    expect(html).not.toContain(user.password);
  });

  it("renders a sidebar link to the profile route", async () => {
    const { jar } = await signInAsRole("admin");
    const response = await getPage(PROFILE_PATH, jar);
    const html = await response.text();

    // The menu item is an anchor, so the route appears as an href. Before this
    // pass the dropdown had no profile entry at all — only sign-out.
    expect(html).toContain(PROFILE_PATH);
  });

  /* ------------------------------------------------------------------ */
  /* Password change — the endpoint the action delegates to              */
  /* ------------------------------------------------------------------ */

  it("changes the password, revokes other sessions, and keeps THIS session", async () => {
    const { user, jar } = await signInAsRole("admin");

    // A SECOND live session for the same account, which must be revoked.
    const other = await signInAs(user.email, user.password, {
      ip: uniqueTestIp(),
    });

    const newPassword = "rotated-passphrase-77-x";

    const change = await authRequest("/change-password", {
      json: {
        currentPassword: user.password,
        newPassword,
        revokeOtherSessions: true,
      },
      jar,
      ip: uniqueTestIp(),
    });
    expect(
      change.status,
      `change-password: ${change.status} ${JSON.stringify(change.body)}`,
    ).toBe(200);

    // 1. The OLD password no longer works.
    const oldSignIn = await authRequest("/sign-in/email", {
      json: { email: user.email, password: user.password },
      ip: uniqueTestIp(),
    });
    expect(oldSignIn.status, "the old password must stop working").not.toBe(
      200,
    );

    // 2. The NEW password works.
    const newSignIn = await authRequest("/sign-in/email", {
      json: { email: user.email, password: newPassword },
      ip: uniqueTestIp(),
    });
    expect(newSignIn.status, "the new password must work").toBe(200);

    // 3. The OTHER session is revoked.
    const otherAfter = await getPage(PROFILE_PATH, other.jar);
    expect(
      [307, 302, 303],
      "the other session must be signed out",
    ).toContain(otherAfter.status);

    // 4. THIS session still reaches the profile.
    const mineAfter = await getPage(PROFILE_PATH, jar);
    expect(
      mineAfter.status,
      "the session that made the change must survive it",
    ).toBe(200);
  });

  it("rejects a WRONG current password as a controlled failure", async () => {
    const { jar } = await signInAsRole("admin");

    const response = await authRequest("/change-password", {
      json: {
        currentPassword: "definitely-not-the-password",
        newPassword: "rotated-passphrase-88-y",
      },
      jar,
      ip: uniqueTestIp(),
    });

    // better-auth answers 400 with INVALID_PASSWORD; the action maps that to the
    // `wrongPassword` field code rather than letting it escape as a 500.
    expect(response.status).not.toBe(200);
    expect(JSON.stringify(response.body)).toContain("INVALID_PASSWORD");
  });

  it("rejects an unauthenticated password change", async () => {
    const response = await authRequest("/change-password", {
      json: {
        currentPassword: "whatever",
        newPassword: "rotated-passphrase-99-z",
      },
      ip: uniqueTestIp(),
    });
    expect(response.status).not.toBe(200);
  });
});
