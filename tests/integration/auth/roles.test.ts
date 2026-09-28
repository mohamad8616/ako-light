/**
 * Pass 11.5A — Step 4: roles.
 *
 * Verifies the USER / ADMIN / OWNER authorization boundaries against the real
 * server-side surface, not hidden UI. Every check here hits the better-auth
 * admin-plugin endpoints through `app/api/auth/[...all]`, so the assertion is
 * about what the server actually permits after authentication — a caller can
 * never reach these by unhiding a button.
 *
 * The two gates used:
 *
 *   - `/admin/list-users` (GET) requires `{ user: ["list"] }`. `adminRole` and
 *     `ownerRole` hold it; `userRole` holds nothing. This is the "admin access"
 *     boundary from the plan.
 *   - `/admin/impersonate-user` (POST) requires `{ user: ["impersonate"] }`, and
 *     additionally `{ user: ["impersonate-admins"] }` when the *target* is an
 *     admin-level user. Only `ownerRole` has `impersonate-admins`
 *     (lib/auth/permissions.ts), so impersonating an admin is the owner-only
 *     boundary from the plan.
 *
 * Roles are applied with `setUserFlags`, which writes `user.role` straight to
 * the database — the state an operator produces through the admin panel. The
 * point is to prove the *reading* side enforces the role, not to re-test
 * `admin.setRole` (which mutates the role and would beg the question).
 *
 * Part of the `auth` Vitest project (vitest.config.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authRequest,
  cleanupFixture,
  closeDb,
  hasDatabaseUrl,
  registerUser,
  setUserFlags,
  signInAs,
  startAuthServer,
  stopAuthServer,
  sweepRunRows,
  type CookieJar,
  type TestUser,
} from "@/tests/helpers/auth-db";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

const created: TestUser[] = [];

/** Registers a user, forces `role`, then signs them in — returns a live jar. */
async function signInAsRole(
  role: "user" | "admin" | "owner",
): Promise<{ user: TestUser; jar: CookieJar }> {
  const user = await registerUser();
  created.push(user);
  await setUserFlags(user.id, { role });
  const { jar } = await signInAs(user.email, user.password);
  return { user, jar };
}

type ListUsersBody = { users?: { id?: string; role?: string }[]; total?: number };

describeAuth("role authorization", () => {
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
  /* Baseline: the session itself reflects the assigned role                */
  /* ---------------------------------------------------------------------- */

  it("reports the stored role on the session", async () => {
    const { user, jar } = await signInAsRole("admin");

    const session = await authRequest<{ user?: { id?: string; role?: string } } | null>(
      "/get-session",
      { jar },
    );

    expect(session.body?.user?.id).toBe(user.id);
    expect(session.body?.user?.role, "the session must expose the real role").toBe("admin");
  });

  /* ---------------------------------------------------------------------- */
  /* Admin-access boundary: USER denied, ADMIN/OWNER allowed               */
  /* ---------------------------------------------------------------------- */

  it("denies ADMIN access to a USER", async () => {
    const { jar } = await signInAsRole("user");

    const response = await authRequest<ListUsersBody>("/admin/list-users", { jar });

    // A plain customer is authenticated but not authorized.
    expect(response.status, JSON.stringify(response.body)).toBe(403);
    // No data may leak on the denial path.
    expect(response.body?.users, "a denied caller must not receive any user rows").toBeUndefined();
  });

  it("allows ADMIN access to an ADMIN", async () => {
    const { jar } = await signInAsRole("admin");

    const response = await authRequest<ListUsersBody>("/admin/list-users", { jar });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(Array.isArray(response.body?.users), "an admin must receive the user list").toBe(true);
  });

  it("allows ADMIN access to an OWNER", async () => {
    const { jar } = await signInAsRole("owner");

    const response = await authRequest<ListUsersBody>("/admin/list-users", { jar });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(Array.isArray(response.body?.users), "an owner must receive the user list").toBe(true);
  });

  it("denies admin endpoints to an unauthenticated caller", async () => {
    const response = await authRequest<unknown>("/admin/list-users");

    // No session at all: rejected before any permission check runs.
    expect(response.status).toBe(401);
  });

  /* ---------------------------------------------------------------------- */
  /* Owner-only boundary: impersonating an admin                           */
  /* ---------------------------------------------------------------------- */

  it("denies an ADMIN impersonating another admin (owner-only)", async () => {
    const { jar } = await signInAsRole("admin");
    // Target is itself admin-level, so `impersonate-admins` is required.
    const target = await signInAsRole("admin");

    const response = await authRequest<unknown>("/admin/impersonate-user", {
      json: { userId: target.user.id },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(JSON.stringify(response.body)).toMatch(/IMPERSONATE_ADMINS|impersonate/i);
  });

  it("allows an OWNER to impersonate an admin (owner-only)", async () => {
    const { jar } = await signInAsRole("owner");
    const target = await signInAsRole("admin");

    const response = await authRequest<{ user?: { id?: string } }>("/admin/impersonate-user", {
      json: { userId: target.user.id },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body?.user?.id, "the impersonated identity must be the target").toBe(
      target.user.id,
    );
  });

  it("keeps the ordinary admin surface available to an admin (owner-only does not over-widen)", async () => {
    // Guard against over-widening: `impersonate-admins` is the ONLY extra
    // permission an owner has, so an admin still sees the ordinary admin list.
    // This pins that the owner-only boundary does not leak into the
    // admin-level surface.
    const { jar } = await signInAsRole("admin");
    const response = await authRequest<ListUsersBody>("/admin/list-users", { jar });
    expect(response.status).toBe(200);
  });

  /* ---------------------------------------------------------------------- */
  /* Privilege changes take effect for new sessions                        */
  /* ---------------------------------------------------------------------- */

  it("reflects a role change made after the account exists", async () => {
    // Start as a plain user: denied.
    const user = await registerUser();
    created.push(user);
    await setUserFlags(user.id, { role: "user" });
    const asUser = await signInAs(user.email, user.password);
    const denied = await authRequest<unknown>("/admin/list-users", { jar: asUser.jar });
    expect(denied.status).toBe(403);

    // Promotion is applied, then a fresh session is minted.
    await setUserFlags(user.id, { role: "admin" });
    const asAdmin = await signInAs(user.email, user.password, { ip: "203.0.113.77" });
    const allowed = await authRequest<ListUsersBody>("/admin/list-users", { jar: asAdmin.jar });
    expect(allowed.status, JSON.stringify(allowed.body)).toBe(200);
  });
});
