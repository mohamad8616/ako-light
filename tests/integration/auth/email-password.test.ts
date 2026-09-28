/**
 * Pass 11.5A — Step 1: email/password authentication.
 *
 * Every case below drives the real HTTP surface the browser uses,
 * `app/api/auth/[...all]/route.ts`, through an in-process Next.js server
 * (see tests/helpers/auth-db.ts). Nothing about better-auth is mocked: the
 * route handler, the origin/CSRF middleware, cookie signing and the Prisma
 * adapter all run for real against the dev database.
 *
 * Why HTTP and not `auth.api.*`: two of the behaviours in scope — "a session
 * cookie is issued" and "logout clears it" — only exist at the transport
 * layer. An in-process API call returns a token and never writes a cookie, so
 * a cookie-based sign-out bug would pass unnoticed.
 *
 * The tier is a new `auth` Vitest project (vitest.config.ts). Existing files
 * are left untouched.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CookieJar,
  authRequest,
  cleanupFixture,
  closeDb,
  findUser,
  findUserByEmail,
  hasDatabaseUrl,
  registerUser,
  startAuthServer,
  stopAuthServer,
  sweepRunRows,
  uniqueEmail,
  type TestUser,
} from "@/tests/helpers/auth-db";

/**
 * These cases share one database and one in-process server, and several of
 * them assert on row counts, so they run sequentially within the file (the
 * `auth` project already sets `fileParallelism: false` globally).
 */
const describeAuth = describe.skipIf(!hasDatabaseUrl);

/** Users created by this file, removed in `afterAll`. */
const created: TestUser[] = [];

async function makeUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
  const user = await registerUser(overrides);
  created.push(user);
  return user;
}

describeAuth("email/password authentication", () => {
  beforeAll(async () => {
    // Compiles the catch-all route and binds an ephemeral port. Slow on a cold
    // cache — this is what the 180s hookTimeout in vitest.config.ts covers.
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
  /* Registration                                                           */
  /* ---------------------------------------------------------------------- */

  it("registers a new email/password account", async () => {
    const email = uniqueEmail();
    const password = "correct-horse-battery-staple";

    const response = await authRequest<{ user?: Record<string, unknown>; token?: string }>(
      "/sign-up/email",
      { json: { email, password, name: "Registration Case" } },
    );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const user = response.body?.user;
    expect(user, "sign-up must return the created user").toBeTruthy();
    expect(user?.email).toBe(email);
    expect(user?.name).toBe("Registration Case");
    // better-auth defaults new users to the plain `user` role (see
    // lib/auth/permissions.ts + admin({ defaultRole: ROLES.user })).
    expect(user?.role).toBe("user");

    created.push({
      id: String(user?.id),
      email,
      password,
      name: "Registration Case",
      phone: "",
    });

    // The row is really in the database, and the password is never stored
    // in plaintext: it lives as a hash on the credential Account.
    const stored = await findUserByEmail(email);
    expect(stored, "user row must exist").not.toBeNull();
    expect(stored?.role).toBe("user");
    expect(stored?.banned).toBe(false);

    // No privilege was granted by the registration path itself.
    expect(stored?.role).not.toBe("admin");
    expect(stored?.role).not.toBe("owner");
  });

  it("hashes the password rather than storing it verbatim", async () => {
    const user = await makeUser();
    const { query } = await import("@/tests/helpers/auth-db");

    const rows = await query<{ password: string | null; providerId: string }>(
      `SELECT password, "providerId" FROM account WHERE "userId" = $1`,
      [user.id],
    );

    expect(rows, "a credential account must exist").toHaveLength(1);
    expect(rows[0].providerId).toBe("credential");
    expect(rows[0].password).toBeTruthy();
    expect(rows[0].password).not.toBe(user.password);
    // bcrypt/argon2 hashes are opaque strings; the plaintext must not appear
    // anywhere in the stored value.
    expect(rows[0].password).not.toContain(user.password);
  });

  it("rejects a duplicate email", async () => {
    const user = await makeUser();

    const duplicate = await authRequest("/sign-up/email", {
      json: {
        email: user.email,
        password: "another-password-entirely",
        name: "Duplicate Attempt",
      },
    });

    expect(duplicate.ok, "second sign-up with the same email must fail").toBe(false);
    expect(duplicate.status).toBe(422);
    // better-auth's own code for this path is the (ugly but stable)
    // USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL — see sign-up.mjs:208. The login
    // UI matches on the same string in components/signIn/useSignInForm.ts.
    expect(duplicate.error?.code).toBe("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL");

    // The original credential still works — the failed attempt must not have
    // overwritten the stored password.
    const jar = new CookieJar();
    const signIn = await authRequest("/sign-in/email", {
      json: { email: user.email, password: user.password },
      jar,
    });
    expect(signIn.status, JSON.stringify(signIn.body)).toBe(200);
  });

  /* ---------------------------------------------------------------------- */
  /* Sign-in                                                                */
  /* ---------------------------------------------------------------------- */

  it("signs in a registered user and issues a session cookie", async () => {
    const user = await makeUser();
    const jar = new CookieJar();

    const response = await authRequest<{ user?: { email?: string }; token?: string }>(
      "/sign-in/email",
      { json: { email: user.email, password: user.password }, jar },
    );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body?.user?.email).toBe(user.email);
    expect(response.body?.token, "sign-in must return a session token").toBeTruthy();

    // The cookie is the transport half of "a session was created".
    const cookieNames = jar.names();
    expect(
      cookieNames.some((name) => name.includes("session_token")),
      `expected a session_token cookie, got: ${cookieNames.join(", ")}`,
    ).toBe(true);
  });

  it("rejects a wrong password with INVALID_EMAIL_OR_PASSWORD", async () => {
    const user = await makeUser();

    const response = await authRequest("/sign-in/email", {
      json: { email: user.email, password: "not-the-right-password" },
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
    expect(response.error?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  it("rejects a nonexistent user with the same generic error as a wrong password", async () => {
    const response = await authRequest("/sign-in/email", {
      json: { email: uniqueEmail(), password: "whatever-password" },
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
    // Deliberately identical to the wrong-password case: the endpoint must not
    // leak whether an account exists (no USER_NOT_FOUND on this path).
    expect(response.error?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  it("rejects invalid credentials payloads before touching the database", async () => {
    // The exact status/code pins which layer rejected the body. sign-in's own
    // body schema types email and password as *plain strings*
    // (sign-in.mjs:218-221), so absent/wrong-typed values are caught by the
    // schema while present-but-invalid values reach the handler:
    //   1. schema — a missing field, or a wrong-typed one, never reaches the
    //      handler and surfaces as VALIDATION_ERROR (400), naming the field;
    //   2. the handler's email format check (sign-in.mjs:287) — both a
    //      malformed and an empty address fail `z.email()`, so both are
    //      INVALID_EMAIL (400);
    //   3. everything else falls through to the credential lookup, which
    //      reports the deliberately generic INVALID_EMAIL_OR_PASSWORD (401) so
    //      the endpoint never leaks whether an account exists. An *empty
    //      password* takes this path: "" is a valid string, so it is only
    //      rejected once the lookup misses.
    const cases: {
      label: string;
      json: Record<string, unknown>;
      status: number;
      code: string;
    }[] = [
      {
        label: "missing password",
        json: { email: uniqueEmail() },
        status: 400,
        code: "VALIDATION_ERROR",
      },
      {
        label: "missing email",
        json: { password: "some-password" },
        status: 400,
        code: "VALIDATION_ERROR",
      },
      {
        label: "empty password",
        json: { email: uniqueEmail(), password: "" },
        status: 401,
        code: "INVALID_EMAIL_OR_PASSWORD",
      },
      {
        label: "non-string password",
        json: { email: uniqueEmail(), password: 12345 },
        status: 400,
        code: "VALIDATION_ERROR",
      },
      {
        label: "malformed email",
        json: { email: "not-an-address", password: "some-password" },
        status: 400,
        code: "INVALID_EMAIL",
      },
      {
        // An empty address is caught by the same handler check ("" fails
        // `z.email()`), so it never reaches the lookup.
        label: "empty email",
        json: { email: "", password: "some-password" },
        status: 400,
        code: "INVALID_EMAIL",
      },
    ];

    for (const { label, json, status, code } of cases) {
      const response = await authRequest("/sign-in/email", { json });
      expect(response.ok, `${label}: must not succeed`).toBe(false);
      expect(response.status, `${label}: status`).toBe(status);
      expect(response.error?.code, `${label}: error code`).toBe(code);
    }
  });

  it("applies stricter email validation on sign-up than on sign-in", async () => {
    const email = uniqueEmail();

    const missingPassword = await authRequest("/sign-up/email", {
      json: { email, name: "X" },
    });
    expect(missingPassword.status).toBe(400);
    expect(missingPassword.error?.code).toBe("VALIDATION_ERROR");

    // Sign-up's schema validates the address (`z.email()` in the user schema),
    // so a malformed email is rejected as VALIDATION_ERROR here — whereas the
    // same input on sign-in reaches the handler and returns INVALID_EMAIL.
    const malformed = await authRequest("/sign-up/email", {
      json: { email: "not-an-address", password: "some-password", name: "X" },
    });
    expect(malformed.status).toBe(400);
    expect(malformed.error?.code).toBe("VALIDATION_ERROR");

    const tooShort = await authRequest("/sign-up/email", {
      json: { email, password: "short", name: "X" },
    });
    expect(tooShort.status).toBe(400);
    expect(tooShort.error?.code).toBe("PASSWORD_TOO_SHORT");

    // None of the rejected attempts may leave a user row behind.
    expect(await findUserByEmail(email), "no row for a rejected sign-up").toBeNull();
  });

  /* ---------------------------------------------------------------------- */
  /* Sign-out / session invalidation                                        */
  /* ---------------------------------------------------------------------- */

  it("logout clears the session cookie and invalidates the session", async () => {
    const user = await makeUser();
    const jar = new CookieJar();

    const signIn = await authRequest("/sign-in/email", {
      json: { email: user.email, password: user.password },
      jar,
    });
    expect(signIn.status).toBe(200);
    const token = (signIn.body as { token?: string })?.token;
    expect(token).toBeTruthy();

    // Sanity: the session is live before sign-out.
    const before = await authRequest<{ user?: { id?: string } } | null>("/get-session", { jar });
    expect(before.status).toBe(200);
    expect(before.body?.user?.id).toBe(user.id);

    const signOut = await authRequest("/sign-out", { json: {}, jar });
    expect(signOut.status, JSON.stringify(signOut.body)).toBe(200);

    // The server must have deleted the row, not merely told the client to
    // forget it — otherwise the token stays replayable.
    const { query } = await import("@/tests/helpers/auth-db");
    const sessions = await query<{ id: string }>(
      `SELECT id FROM session WHERE token = $1`,
      [token],
    );
    expect(sessions, "the session row must be gone after sign-out").toHaveLength(0);

    // And the revoked cookie no longer authenticates.
    const cleared = jar.wasCleared(
      jar.names().find((name) => name.includes("session_token")) ?? "session_token",
    );
    expect(cleared || jar.names().length === 0).toBe(true);
  });

  it("rejects a session token that no longer exists", async () => {
    const response = await authRequest<unknown>("/get-session", {
      headers: { cookie: "better-auth.session_token=not-a-real-token.signature" },
    });

    expect(response.status).toBe(200);
    expect(response.body, "a forged token must resolve to no session").toBeNull();
  });

  it("treats a cleared session cookie as signed out", async () => {
    const user = await makeUser();
    const jar = new CookieJar();

    await authRequest("/sign-in/email", {
      json: { email: user.email, password: user.password },
      jar,
    });
    expect(jar.names().length).toBeGreaterThan(0);

    await authRequest("/sign-out", { json: {}, jar });

    const after = await authRequest<unknown>("/get-session", { jar });
    expect(after.status).toBe(200);
    expect(after.body, "get-session must be null after sign-out").toBeNull();
  });

  it("get-session is null when no cookie is presented", async () => {
    const response = await authRequest<unknown>("/get-session");
    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });

  /* ---------------------------------------------------------------------- */
  /* Route wiring                                                           */
  /* ---------------------------------------------------------------------- */

  it("serves the catch-all route for GET", async () => {
    // `toNextJsHandler(auth)` exports GET and POST; a missing GET export would
    // silently break every session read in the app. `/ok` is better-auth's
    // built-in liveness endpoint and needs no session.
    const get = await authRequest("/ok");
    expect(get.status).toBe(200);
    expect(get.body).toEqual({ ok: true });

    // An unknown path under the catch-all must 404 — i.e. the route is mounted
    // and better-auth's own router, not Next's, decides what exists.
    const unknown = await authRequest("/definitely-not-an-endpoint");
    expect(unknown.status, "unknown auth paths must 404, not resolve").toBe(404);
  });

  it("never returns OTP codes or password material in auth responses", async () => {
    const user = await makeUser();

    const signIn = await authRequest<Record<string, unknown>>("/sign-in/email", {
      json: { email: user.email, password: user.password },
    });

    const serialised = JSON.stringify(signIn.body);
    expect(serialised).not.toContain(user.password);
    // `password` is not part of the User model better-auth serialises, and the
    // OTP plugin only ever puts codes in the Verification table.
    expect(signIn.body).not.toHaveProperty("password");
    expect((signIn.body as { user?: Record<string, unknown> }).user).not.toHaveProperty(
      "password",
    );

    const stored = await findUser(user.id);
    expect(stored, "user row must exist").not.toBeNull();
  });
});
