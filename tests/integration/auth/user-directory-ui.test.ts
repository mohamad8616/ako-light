/**
 * `/admin/users` — the SHARED user directory, over real HTTP.
 *
 * Mocks nothing. Boots the real Next app, signs in over the real `/api/auth/*`
 * surface with a real cookie jar, and fetches `/admin/users` as each role to
 * assert what the SERVER returns:
 *
 *   - an OWNER sees the directory (200) and the customer rows render;
 *   - an ADMIN sees the directory too (200) — this is the key difference from
 *     the owner-only `/admin/admins`;
 *   - a plain USER is bounced off the admin surface entirely;
 *   - an anonymous caller is sent to sign-in;
 *   - NO credential material reaches the response body.
 *
 * Part of the `auth` Vitest project (vitest.config.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupFixture,
  closeDb,
  CookieJar,
  fetchPageWhenWarm,
  hasDatabaseUrl,
  registerUser,
  setUserFlags,
  signInAs,
  startAuthServer,
  stopAuthServer,
  sweepRunRows,
  uniqueTestIp,
  type TestUser,
} from "@/tests/helpers/auth-db";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

const created: TestUser[] = [];

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

describeAuth("shared user directory — real HTTP surface", () => {
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
    "an OWNER reaches /admin/users and the directory renders a customer",
    async () => {
      const { jar } = await signInAsRole("owner");
      // A customer the directory SHOULD list.
      const customer = await registerUser();
      created.push(customer);

      const response = await getPage("/admin/users", jar);
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain(customer.email);
    },
    300_000,
  );

  it(
    "an ADMIN reaches /admin/users as well (unlike owner-only /admin/admins)",
    async () => {
      const { jar } = await signInAsRole("admin");
      const customer = await registerUser();
      created.push(customer);

      const response = await getPage("/admin/users", jar);
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain(customer.email);
    },
    300_000,
  );

  it(
    "the directory response contains NO credential material",
    async () => {
      const { jar } = await signInAsRole("owner");
      const customer = await registerUser();
      created.push(customer);

      const response = await getPage("/admin/users", jar);
      const html = await response.text();

      // The customer's real password (a known plaintext in the harness) must
      // never appear, nor any credential-shaped field name from Account/Session.
      expect(html).not.toContain(customer.password);
      for (const forbidden of [
        "passwordHash",
        "hashedPassword",
        "accessToken",
        "refreshToken",
        "$2b$",
      ]) {
        expect(html, `response must not contain "${forbidden}"`).not.toContain(
          forbidden,
        );
      }
    },
    300_000,
  );

  it(
    "bounces a plain USER off the admin surface entirely",
    async () => {
      const { jar } = await signInAsRole("user");

      const response = await getPage("/admin/users", jar);

      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
      const location = response.headers.get("location") ?? "";
      expect(location, "must leave the admin surface").not.toContain("/admin");

      const html = await response.text();
      expect(html).not.toContain('id="directory-search"');
    },
    300_000,
  );

  it(
    "sends an anonymous caller to sign-in",
    async () => {
      const { origin } = await startAuthServer();
      // A genuinely empty jar — no session cookie.
      const response = await fetchPageWhenWarm(
        origin,
        "/admin/users",
        new CookieJar(),
      );

      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
      const location = response.headers.get("location") ?? "";
      expect(location).toContain("/sign-in");
    },
    300_000,
  );
});
