/**
 * Pass 11.5B — §3 (owner authorization) + §5 (direct access) + §6 (regression):
 * the owner-only boundary over REAL HTTP.
 *
 * Pass 11.5A's `roles.test.ts` already proved the two hard halves of this
 * boundary: an ADMIN cannot impersonate another admin (403), and an OWNER can
 * (200). What it does not cover is the rest of the §3 matrix on that same
 * owner-gated endpoint — a plain USER and an anonymous caller — nor the
 * regression §6 asks for spelled out as one place.
 *
 * Why the impersonate endpoint is the right surface for "owner-only
 * functionality":
 *   - `POST /admin/impersonate-user` first requires `{ user: ["impersonate"] }`
 *     (admin + owner hold it, a plain user holds nothing → 403), and then —
 *     when the target is admin-level — additionally requires
 *     `{ user: ["impersonate-admins"] }`, which ONLY `ownerRole` carries
 *     (lib/auth/permissions.ts). So the same endpoint expresses BOTH the
 *     "admin-level" gate (USER denied / ADMIN+OWNER allowed) and the
 *     "owner-only" gate (ADMIN denied / OWNER allowed).
 *   - It is a real server endpoint reached by a raw POST, so it is exactly the
 *     "hiding the button is not authorization" case: a caller who forges the
 *     request still gets the server's answer.
 *
 * Roles are written straight to the database with `setUserFlags` — the state
 * an operator produces — so the test proves the READING side enforces rank.
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
  uniqueTestIp,
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
  // Distinct IP per sign-in keeps the auth rate limiter from bucketing these
  // many logins together (the suite legitimately mints a lot of sessions).
  const { jar } = await signInAs(user.email, user.password, {
    ip: uniqueTestIp(),
  });
  return { user, jar };
}

describeAuth("owner-only boundary over HTTP", () => {
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

  /* --------------------------------------------------------------------- */
  /* §3 — the full owner-endpoint matrix: anon / USER / ADMIN / OWNER       */
  /* --------------------------------------------------------------------- */

  it("denies an unauthenticated caller the owner endpoint (401)", async () => {
    const response = await authRequest<unknown>("/admin/impersonate-user", {
      json: { userId: "irrelevant" },
    });
    // No session: rejected before any permission check runs.
    expect(response.status).toBe(401);
  });

  it("denies a plain USER the owner endpoint (403)", async () => {
    const { jar } = await signInAsRole("user");
    // The userRole carries `user: []`, so even the base `impersonate` gate
    // rejects a customer before the owner-only check is reached.
    const target = await signInAsRole("user");

    const response = await authRequest<unknown>("/admin/impersonate-user", {
      json: { userId: target.user.id },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
  });

  it("allows an OWNER to impersonate a plain user (owner passes the base gate)", async () => {
    const { jar } = await signInAsRole("owner");
    const target = await signInAsRole("user");

    const response = await authRequest<{ user?: { id?: string } }>(
      "/admin/impersonate-user",
      { json: { userId: target.user.id }, jar },
    );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body?.user?.id, "the impersonated identity must be the target").toBe(
      target.user.id,
    );
  });

  it("regression: an ADMIN cannot impersonate an admin (owner-only), an OWNER can", async () => {
    // §6 — the single highest-value boundary in one place: the SAME request,
    // sent by an admin and by an owner, must differ. This is the "hiding the
    // button is not authorization" case: both callers are admin-level and
    // both can reach the endpoint, but only the owner may target an admin.
    const target = await signInAsRole("admin");

    const asAdmin = await signInAsRole("admin");
    const adminResponse = await authRequest<unknown>("/admin/impersonate-user", {
      json: { userId: target.user.id },
      jar: asAdmin.jar,
    });
    expect(adminResponse.status, JSON.stringify(adminResponse.body)).toBe(403);

    const asOwner = await signInAsRole("owner");
    const ownerResponse = await authRequest<{ user?: { id?: string } }>(
      "/admin/impersonate-user",
      { json: { userId: target.user.id }, jar: asOwner.jar },
    );
    expect(ownerResponse.status, JSON.stringify(ownerResponse.body)).toBe(200);
    expect(ownerResponse.body?.user?.id).toBe(target.user.id);
  });

  /* --------------------------------------------------------------------- */
  /* §6 — regression: the admin-level surface stays open to ADMIN, not      */
  /*      widened for USER                                                  */
  /* --------------------------------------------------------------------- */

  it("regression: USER denied / ADMIN allowed on the admin list endpoint", async () => {
    const asUser = await signInAsRole("user");
    const denied = await authRequest<unknown>("/admin/list-users", {
      jar: asUser.jar,
    });
    expect(denied.status).toBe(403);

    const asAdmin = await signInAsRole("admin");
    const allowed = await authRequest<{ users?: unknown[] }>("/admin/list-users", {
      jar: asAdmin.jar,
    });
    expect(allowed.status, JSON.stringify(allowed.body)).toBe(200);
    expect(Array.isArray(allowed.body?.users)).toBe(true);
  });
});
