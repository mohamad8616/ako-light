/**
 * Pass A — Better Auth admin-endpoint authorization boundary.
 *
 * The `/admin/*` surface lives in the better-auth admin plugin, NOT in the
 * project's own server actions. Pass 12.x proved the actions enforce the
 * `user < admin < owner` policy; it did not prove the built-in HTTP endpoints
 * do. This file closes that gap by driving the REAL endpoints over HTTP, with
 * real signed sessions, exactly as an attacker with a browser console would.
 *
 * ── The policy under test ───────────────────────────────────────────────────
 *
 *   - only an `owner` may change ANY role (the admin role map carries no
 *     `set-role`; `lib/auth/permissions.ts`);
 *   - only an `owner` may ban/unban/delete/revoke/impersonate an
 *     admin-level actor, and only an owner may impersonate at all;
 *   - an `admin` may still READ the directory (`user: ["list"]`);
 *   - nobody may act on themselves;
 *   - anonymous and plain `user` callers get nothing.
 *
 * ── Why these endpoints ─────────────────────────────────────────────────────
 *
 * `set-role` and `admin/update-user` are the two role-write paths, and
 * `create-user` is a third (its `role` body field). If any of them still
 * accepted an admin's token, the whole dashboard policy would be bypassable
 * with a single POST — which is precisely the class of bug this pass exists
 * to prevent.
 *
 * Roles are applied with `setUserFlags` (a direct column write) so the test
 * proves the READING side enforces rank, not that some earlier writer did.
 *
 * Part of the `auth` Vitest project (vitest.config.ts).
 */
import {
  authRequest,
  cleanupFixture,
  closeDb,
  findUser,
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
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

const created: TestUser[] = [];

/** Registers a user, forces `role`, then signs them in — returns a live jar. */
async function signInAsRole(
  role: "user" | "admin" | "owner",
): Promise<{ user: TestUser; jar: CookieJar }> {
  const user = await registerUser();
  created.push(user);
  await setUserFlags(user.id, { role });
  // A distinct IP per sign-in keeps the auth rate limiter from bucketing the
  // suite's many logins together.
  const { jar } = await signInAs(user.email, user.password, {
    ip: uniqueTestIp(),
  });
  return { user, jar };
}

/** The role column as it really is on disk. `null` when the row is gone. */
async function roleOf(userId: string): Promise<string | null> {
  const row = await findUser(userId);
  return row?.role ?? null;
}

/**
 * Registers a user with `role` but does NOT sign them in — for cases where the
 * account is only a TARGET, so no cookie jar is needed.
 */
async function makeTarget(role: "user" | "admin" | "owner"): Promise<TestUser> {
  const user = await registerUser();
  created.push(user);
  await setUserFlags(user.id, { role });
  return user;
}

/** True when `password` actually signs the account in. */
async function passwordWorks(email: string, password: string): Promise<boolean> {
  const response = await authRequest("/sign-in/email", {
    json: { email, password },
    ip: uniqueTestIp(),
  });
  return response.status === 200;
}

const NEW_PASSWORD = "rotated-correct-horse-staple";

describeAuth("better-auth admin endpoint authorization", () => {
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
  /* 1-2. An admin may never grant a role — least of all owner              */
  /* ---------------------------------------------------------------------- */

  it("denies an ADMIN promoting a customer to OWNER via /admin/set-role", async () => {
    const { jar } = await signInAsRole("admin");
    const target = await signInAsRole("user");

    const response = await authRequest<unknown>("/admin/set-role", {
      json: { userId: target.user.id, role: "owner" },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(
      await roleOf(target.user.id),
      "the role write must not have happened",
    ).toBe("user");
  });

  it("denies an ADMIN promoting a customer to ADMIN via /admin/set-role", async () => {
    const { jar } = await signInAsRole("admin");
    const target = await signInAsRole("user");

    const response = await authRequest<unknown>("/admin/set-role", {
      json: { userId: target.user.id, role: "admin" },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(await roleOf(target.user.id)).toBe("user");
  });

  it("denies an ADMIN the {user:['set-role']} capability itself", async () => {
    // The direct check, independent of which endpoint asks for it: this is the
    // single statement the whole owner-only policy reduces to. If this ever
    // returns success for an admin, the boundary is gone.
    const { jar } = await signInAsRole("admin");

    const response = await authRequest<{ success?: boolean }>(
      "/admin/has-permission",
      {
        json: { permissions: { user: ["set-role"] } },
        jar,
      },
    );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body?.success, "an admin must not hold set-role").toBe(
      false,
    );
  });

  it("denies an ADMIN the {user:['set-role']} capability on /admin/update-user too", async () => {
    const { jar } = await signInAsRole("admin");
    const target = await signInAsRole("user");

    const response = await authRequest<unknown>("/admin/update-user", {
      json: { userId: target.user.id, data: { role: "owner" } },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(await roleOf(target.user.id)).toBe("user");
  });

  it("denies an ADMIN minting an owner through /admin/create-user", async () => {
    // `create-user` accepts a `role` body field; with the admin role map it
    // must be refused for an admin before any row is created.
    const { jar } = await signInAsRole("admin");
    const email = `create-user-attempt-${Date.now()}@example.test`;

    const response = await authRequest<unknown>("/admin/create-user", {
      json: {
        email,
        name: "Minted Owner",
        password: "correct-horse-battery-staple",
        role: "owner",
      },
      jar,
    });

    expect([403, 400], JSON.stringify(response.body)).toContain(
      response.status,
    );
    expect(response.status, "no user may be created by that call").toBe(403);
  });

  /* ---------------------------------------------------------------------- */
  /* 3. An admin may not touch an owner's role or ban state                 */
  /* ---------------------------------------------------------------------- */

  it("denies an ADMIN banishing an OWNER via /admin/ban-user", async () => {
    const { jar } = await signInAsRole("admin");
    const target = await signInAsRole("owner");

    const response = await authRequest<unknown>("/admin/ban-user", {
      json: { userId: target.user.id, banReason: "coup" },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    const row = await findUser(target.user.id);
    expect(row?.banned, "the owner must not have been banned").toBe(false);
  });

  it("denies an ADMIN changing an OWNER's role via /admin/set-role", async () => {
    const { jar } = await signInAsRole("admin");
    const target = await signInAsRole("owner");

    const response = await authRequest<unknown>("/admin/set-role", {
      json: { userId: target.user.id, role: "user" },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(await roleOf(target.user.id)).toBe("owner");
  });

  /* ---------------------------------------------------------------------- */
  /* 4. The owner may perform exactly the allowed role + moderation moves    */
  /* ---------------------------------------------------------------------- */

  it("allows an OWNER to promote a customer straight to OWNER", async () => {
    const { jar } = await signInAsRole("owner");
    const target = await signInAsRole("user");

    const response = await authRequest<unknown>("/admin/set-role", {
      json: { userId: target.user.id, role: "owner" },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await roleOf(target.user.id)).toBe("owner");
  });

  it("allows an OWNER to ban and unban a customer", async () => {
    const { jar } = await signInAsRole("owner");
    const target = await signInAsRole("user");

    const banned = await authRequest<unknown>("/admin/ban-user", {
      json: { userId: target.user.id, banReason: "spam" },
      jar,
    });
    expect(banned.status, JSON.stringify(banned.body)).toBe(200);
    expect((await findUser(target.user.id))?.banned).toBe(true);

    const unbanned = await authRequest<unknown>("/admin/unban-user", {
      json: { userId: target.user.id },
      jar,
    });
    expect(unbanned.status, JSON.stringify(unbanned.body)).toBe(200);
    expect((await findUser(target.user.id))?.banned).toBe(false);
  });

  /* ---------------------------------------------------------------------- */
  /* 5. Nobody may change their own role through these endpoints             */
  /* ---------------------------------------------------------------------- */

  it("denies an OWNER changing their own role via /admin/set-role", async () => {
    const { user, jar } = await signInAsRole("owner");

    const response = await authRequest<unknown>("/admin/set-role", {
      json: { userId: user.id, role: "user" },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(await roleOf(user.id), "self-demotion must be impossible").toBe(
      "owner",
    );
  });

  it("denies an ADMIN changing their own role via /admin/set-role", async () => {
    const { user, jar } = await signInAsRole("admin");

    const response = await authRequest<unknown>("/admin/set-role", {
      json: { userId: user.id, role: "owner" },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(await roleOf(user.id)).toBe("admin");
  });

  it("refuses a self-ban before better-auth's own guard is reached", async () => {
    // Our rank guard runs first and answers 403 CANNOT_TARGET_SELF. The 400 this
    // test used to expect was better-auth's OWN self-ban check — which only
    // produced a response because the guard was not executing at all. Now that
    // it does, 403 is the correct and stronger outcome.
    const { user, jar } = await signInAsRole("owner");

    const response = await authRequest<{ code?: string }>("/admin/ban-user", {
      json: { userId: user.id },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(response.body?.code).toBe("CANNOT_TARGET_SELF");
    expect((await findUser(user.id))?.banned).toBe(false);
  });

  /* ---------------------------------------------------------------------- */
  /* 6. Anonymous and plain-user callers get nothing                        */
  /* ---------------------------------------------------------------------- */

  it("denies an unauthenticated caller the role-write endpoints (401)", async () => {
    const endpoints = [
      ["/admin/set-role", { userId: "irrelevant", role: "owner" }],
      ["/admin/ban-user", { userId: "irrelevant" }],
      ["/admin/remove-user", { userId: "irrelevant" }],
      ["/admin/impersonate-user", { userId: "irrelevant" }],
    ] as const;

    for (const [path, json] of endpoints) {
      const response = await authRequest<unknown>(path, { json });
      expect(
        response.status,
        `${path} → ${JSON.stringify(response.body)}`,
      ).toBe(401);
    }
  });

  it("denies a plain USER every admin mutation endpoint (403)", async () => {
    const { jar } = await signInAsRole("user");
    const target = await signInAsRole("user");

    const endpoints = [
      ["/admin/set-role", { userId: target.user.id, role: "owner" }],
      ["/admin/ban-user", { userId: target.user.id }],
      ["/admin/remove-user", { userId: target.user.id }],
      ["/admin/impersonate-user", { userId: target.user.id }],
      ["/admin/update-user", { userId: target.user.id, data: { name: "x" } }],
    ] as const;

    for (const [path, json] of endpoints) {
      const response = await authRequest<unknown>(path, { json, jar });
      expect(
        response.status,
        `${path} → ${JSON.stringify(response.body)}`,
      ).toBe(403);
    }

    // No side effects either.
    expect((await findUser(target.user.id))?.banned).toBe(false);
    expect(await roleOf(target.user.id)).toBe("user");
  });

  /* ---------------------------------------------------------------------- */
  /* 7. Regression — the intended admin surface still works                 */
  /* ---------------------------------------------------------------------- */

  it("still lets an ADMIN read the directory", async () => {
    const { jar } = await signInAsRole("admin");

    const response = await authRequest<{ users?: unknown[] }>(
      "/admin/list-users",
      { jar },
    );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(Array.isArray(response.body?.users)).toBe(true);
  });

  it("still lets an ADMIN read a user record", async () => {
    const { jar } = await signInAsRole("admin");
    const target = await signInAsRole("user");

    const response = await authRequest<{ id?: string }>("/admin/get-user", {
      query: { id: target.user.id },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body?.id).toBe(target.user.id);
  });

  it("still lets an ADMIN update a non-privileged field of a customer", async () => {
    const { jar } = await signInAsRole("admin");
    const target = await signInAsRole("user");

    const response = await authRequest<unknown>("/admin/update-user", {
      json: { userId: target.user.id, data: { name: "Renamed By Admin" } },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect((await findUser(target.user.id))?.name).toBe("Renamed By Admin");
  });

  it("still lets an OWNER ban an ADMIN (owner outranks admin)", async () => {
    const { jar } = await signInAsRole("owner");
    const target = await signInAsRole("admin");

    const response = await authRequest<unknown>("/admin/ban-user", {
      json: { userId: target.user.id, banReason: "policy" },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect((await findUser(target.user.id))?.banned).toBe(true);
  });

  /* ---------------------------------------------------------------------- */
  /* 8. /admin/set-user-password — the account-takeover path                */
  /* ---------------------------------------------------------------------- */

  it("denies an ADMIN resetting an OWNER's password", async () => {
    // THE escalation this pass closes. 1.7.7's `adminAc` grants `set-password`
    // and the admin role map drops only `set-role`, so an admin HOLDS
    // `user: ["set-password"]`. Before the rank guard was extended to this
    // endpoint, this call succeeded — after which the admin could simply sign
    // in as the owner and the whole hierarchy was bypassed.
    const { jar } = await signInAsRole("admin");
    const target = await makeTarget("owner");

    const response = await authRequest<unknown>("/admin/set-user-password", {
      json: { userId: target.id, newPassword: NEW_PASSWORD },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    // The original credential must still work — proof that no write happened.
    expect(
      await passwordWorks(target.email, target.password),
      "the owner's password must be untouched",
    ).toBe(true);
  });

  it("denies an ADMIN resetting another ADMIN's password", async () => {
    const { jar } = await signInAsRole("admin");
    const target = await makeTarget("admin");

    const response = await authRequest<unknown>("/admin/set-user-password", {
      json: { userId: target.id, newPassword: NEW_PASSWORD },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(await passwordWorks(target.email, target.password)).toBe(true);
  });

  it("still allows an ADMIN to reset a CUSTOMER's password", async () => {
    // Permitted moderation, and the reason the guard is a RANK check rather
    // than a blanket denial of the endpoint: the target is strictly lower.
    const { jar } = await signInAsRole("admin");
    const target = await makeTarget("user");

    const response = await authRequest<unknown>("/admin/set-user-password", {
      json: { userId: target.id, newPassword: NEW_PASSWORD },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await passwordWorks(target.email, NEW_PASSWORD)).toBe(true);
  });

  it("allows an OWNER to reset an ADMIN's password", async () => {
    const { jar } = await signInAsRole("owner");
    const target = await makeTarget("admin");

    const response = await authRequest<unknown>("/admin/set-user-password", {
      json: { userId: target.id, newPassword: NEW_PASSWORD },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await passwordWorks(target.email, NEW_PASSWORD)).toBe(true);
  });

  it("denies an OWNER resetting their OWN password through the admin endpoint", async () => {
    // Self-targeting stays refused even for the highest role. Changing your own
    // password is the ordinary account flow, not this endpoint.
    const { user, jar } = await signInAsRole("owner");

    const response = await authRequest<unknown>("/admin/set-user-password", {
      json: { userId: user.id, newPassword: NEW_PASSWORD },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(await passwordWorks(user.email, user.password)).toBe(true);
  });

  /* ---------------------------------------------------------------------- */
  /* 9. Session listing — the token-discovery step                          */
  /* ---------------------------------------------------------------------- */

  it("denies an ADMIN listing an OWNER's sessions", async () => {
    // This returns session TOKENS, which are the input
    // /admin/revoke-user-session needs — and that endpoint takes a
    // `sessionToken`, not a `userId`, so it cannot be rank-checked here.
    // Blocking the discovery step is what closes the chain.
    const { jar } = await signInAsRole("admin");
    const target = await signInAsRole("owner");

    const response = await authRequest<unknown>("/admin/list-user-sessions", {
      json: { userId: target.user.id },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
  });

  it("still allows an ADMIN to list a CUSTOMER's sessions", async () => {
    const { jar } = await signInAsRole("admin");
    const target = await signInAsRole("user");

    const response = await authRequest<unknown>("/admin/list-user-sessions", {
      json: { userId: target.user.id },
      jar,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
  });
});
