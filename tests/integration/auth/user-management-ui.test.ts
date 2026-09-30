/**
 * Pass 11.5C — the owner-only user-management SCREEN, over real HTTP.
 *
 * This file deliberately mocks NOTHING. It boots the real Next app, signs in
 * over the real `/api/auth/*` surface with a real cookie jar, and then fetches
 * `/en/admin/admins` as each role to assert what the SERVER actually returns.
 *
 * Why it is separate from `tests/server/user-management-actions-live.test.ts`:
 * that file must stub `next/headers` to hand a Server Action its request, and
 * stubbing `next/headers` in a worker that has also booted Next breaks the app
 * (the auth endpoints start returning 500). So the HTTP/UI half lives here,
 * mock-free, and the action half lives there, app-free. Between them the whole
 * path is covered without either half weakening the other.
 *
 * What this proves:
 *   - a real owner session carries the `owner` role (the gate's input);
 *   - the screen RENDERS for an owner and shows the "you cannot change your own
 *     role or status" note on the owner's own row — the visible half of the
 *     self-protection, as opposed to a silently missing control;
 *   - an ADMIN-role session navigating to the same URL is redirected to
 *     `/admin` by the page's own `requireOwnerAccess()` — the server's answer,
 *     not a hidden nav item.
 *
 * Part of the `auth` Vitest project (vitest.config.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupFixture,
  closeDb,
  fetchPageWhenWarm,
  hasDatabaseUrl,
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

/**
 * Fetches an app page with the given session, without following redirects.
 *
 * Uses the harness's warm-retry helper: on a cold dev cache the first request
 * to a page route comes back 404 while Turbopack compiles it, which is not a
 * routing failure (the production build serves the same path with 200).
 */
async function getPage(path: string, jar: CookieJar): Promise<Response> {
  const { origin } = await startAuthServer();
  return fetchPageWhenWarm(origin, path, jar);
}

describeAuth("owner-only user management — real HTTP surface", () => {
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

  it(
    "renders the screen for an OWNER and shows the self-protection note on their own row",
    async () => {
      const { user, jar } = await signInAsRole("owner");

      const response = await getPage("/en/admin/admins", jar);
      expect(response.status).toBe(200);

      const html = await response.text();

      // The owner's own account really is on the page…
      expect(html).toContain(user.email);
      // …and its role cell renders the read-only note instead of a select.
      expect(
        html,
        "the owner's own row must show the self-protection note",
      ).toContain("You cannot change your own role or status.");
    },
    // Generous: a cold Turbopack compile of the admin shell has been measured
    // at ~70s, on top of the warm-retry budget.
    300_000,
  );

  it(
    "redirects an ADMIN-role session away from the screen (not merely hidden in nav)",
    async () => {
      const { jar } = await signInAsRole("admin");

      const response = await getPage("/en/admin/admins", jar);

      expect(
        response.status,
        "the page's own owner gate must refuse, not render",
      ).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
      expect(response.headers.get("location")).toContain("/admin");

      // The refusal must not leak the management table.
      const html = await response.text();
      expect(html).not.toContain("You cannot change your own role or status.");
    },
    // Generous: a cold Turbopack compile of the admin shell has been measured
    // at ~70s, on top of the warm-retry budget.
    300_000,
  );

  it(
    "bounces a plain USER session off the admin surface entirely",
    async () => {
      const { jar } = await signInAsRole("user");

      const response = await getPage("/en/admin/admins", jar);

      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);

      // Two layers can refuse here, and for a plain `user` the EDGE gate in
      // proxy.ts wins: it runs before any rendering and sends a non-admin-level
      // session to the site root (the page's own `requireOwnerAccess()` would
      // send them to sign-in, but it never gets the chance). What matters is
      // that the refusal happens on the server and the screen is never built.
      const location = response.headers.get("location") ?? "";
      expect(location, "must leave the admin surface").not.toContain("/admin");

      const html = await response.text();
      expect(html).not.toContain("You cannot change your own role or status.");
    },
    // Generous: a cold Turbopack compile of the admin shell has been measured
    // at ~70s, on top of the warm-retry budget.
    300_000,
  );
});
