/**
 * Pass 13.5B — the `/admin/media` route's authorization boundary, over real HTTP.
 *
 * This file deliberately mocks NOTHING. It boots the real Next app, signs in
 * over the real `/api/auth/*` surface with a real cookie jar, and then fetches
 * `/en/admin/media` as each role to assert what the SERVER actually returns.
 *
 * The plan asks for exactly this and it cannot be proved any other way: the
 * media page has no gate of its own — it inherits the `(admin)` layout's
 * `requireAdminAccess()`, with `proxy.ts` in front of it — so the honest test is
 * a real request through both layers, not a unit test of a helper. A `USER`
 * must be refused by the EDGE gate before the library is ever built; an `ADMIN`
 * and an `OWNER` must both get the real screen, because the media library is
 * admin-level rather than owner-only (unlike `/admin/admins`).
 *
 * The assertions are on USER-VISIBLE BEHAVIOUR (status, Location, and a string
 * the page actually renders) rather than on DOM structure or CSS.
 *
 * Part of the `auth` Vitest project (vitest.config.ts). That tier is slow — it
 * boots the app — and is documented in docs/testing.md as environment-sensitive.
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

/** The upload CTA the page always renders — proof the library really built. */
const UPLOAD_LABEL = "Upload media";

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
 * Fetches the media page with the given session, without following redirects.
 *
 * Uses the harness's warm-retry helper: on a cold dev cache the first request
 * to a page route comes back 404 while Turbopack compiles it, which is not a
 * routing failure (the production build serves the same path with 200).
 */
async function getMediaPage(jar: CookieJar): Promise<Response> {
  const { origin } = await startAuthServer();
  return fetchPageWhenWarm(origin, "/en/admin/media", jar);
}

describeAuth("media library route — real HTTP authorization", () => {
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
    "renders the media library for an ADMIN",
    async () => {
      const { jar } = await signInAsRole("admin");

      const response = await getMediaPage(jar);
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(
        html,
        "the library must actually render for an admin",
      ).toContain(UPLOAD_LABEL);
    },
    // Generous: a cold Turbopack compile of the admin shell has been measured
    // at ~70s, on top of the warm-retry budget.
    300_000,
  );

  it(
    "renders the media library for an OWNER too (it is not owner-only)",
    async () => {
      const { jar } = await signInAsRole("owner");

      const response = await getMediaPage(jar);
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain(UPLOAD_LABEL);
    },
    300_000,
  );

  it(
    "bounces a plain USER session off the media route entirely",
    async () => {
      const { jar } = await signInAsRole("user");

      const response = await getMediaPage(jar);

      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);

      // Two layers can refuse here, and for a plain `user` the EDGE gate in
      // proxy.ts wins: it runs before any rendering and sends a non-admin-level
      // session to the site root (the layout's own `requireAdminAccess()` would
      // send them to sign-in, but it never gets the chance). What matters is
      // that the refusal happens on the server and the screen is never built.
      const location = response.headers.get("location") ?? "";
      expect(location, "must leave the admin surface").not.toContain("/admin");

      const html = await response.text();
      expect(html).not.toContain(UPLOAD_LABEL);
    },
    300_000,
  );
});
