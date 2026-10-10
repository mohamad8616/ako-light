/**
 * Pass A.1 — the admin-endpoint guard, driven through the REAL Better Auth
 * handler.
 *
 * WHY THIS FILE EXISTS ALONGSIDE admin-endpoint-authorization.test.ts
 *
 * That file drives the endpoints through the in-process Next dev server, which
 * is the most faithful harness — but in this environment that server cannot
 * complete a database write (see the Pass A.1 report: every `/api/auth/*` DB
 * call dies with "Connection terminated unexpectedly"). That would leave the
 * two escalation paths VERIFIED BY INSPECTION ONLY, which is not verification.
 *
 * `auth.handler(request)` is the SAME request pipeline the route delegates to:
 * `app/api/auth/[...all]/route.ts` is literally `toNextJsHandler(auth)`, so
 * `auth.handler` runs better-auth's router, its plugin hooks and its endpoint
 * middleware. What it skips is Next's dev server and `nextCookies()` — neither
 * of which is part of the authorization decision under test.
 *
 * Sessions are obtained the same way a browser obtains them (a real
 * `/sign-in/email` round trip, taking the `set-cookie` it returns), so the
 * guard sees a genuine session rather than a hand-built one.
 *
 * NOTHING here prints a password, a session token or a cookie value.
 */
import {
  cleanupFixture,
  closeDb,
  findUser,
  hasDatabaseUrl,
  setUserFlags,
  uniqueEmail,
  uniqueTestIp,
} from "@/tests/helpers/auth-db";
import { auth } from "@/lib/auth/auth";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const describeAuth = describe.skipIf(!hasDatabaseUrl);

const ORIGIN = "http://localhost:3000";
const PASSWORD = "correct-horse-battery-staple";
const ROTATED = "rotated-correct-horse-staple";

const created: { id: string; email: string }[] = [];

/** A user row created through the real sign-up endpoint. */
async function makeUser(
  role: "user" | "admin" | "owner",
): Promise<{ id: string; email: string; cookie: string }> {
  const email = uniqueEmail();
  const signUp = await auth.handler(
    new Request(`${ORIGIN}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        "x-forwarded-for": uniqueTestIp(),
      },
      body: JSON.stringify({ email, password: PASSWORD, name: email }),
    }),
  );
  if (signUp.status !== 200) {
    throw new Error(`sign-up failed with ${signUp.status}`);
  }
  const body = (await signUp.json()) as { user?: { id?: string } };
  const id = body.user?.id;
  if (!id) throw new Error("sign-up returned no user id");
  created.push({ id, email });

  await setUserFlags(id, { role });

  // Sign in AFTER the role is set, so the session carries it.
  const signIn = await auth.handler(
    new Request(`${ORIGIN}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        "x-forwarded-for": uniqueTestIp(),
      },
      body: JSON.stringify({ email, password: PASSWORD }),
    }),
  );
  if (signIn.status !== 200) {
    throw new Error(`sign-in failed with ${signIn.status}`);
  }
  return { id, email, cookie: cookieFrom(signIn) };
}

/** The `name=value` pairs of every Set-Cookie, joined for a request header. */
function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
}

/** Calls a better-auth endpoint through the real handler. */
async function callAdmin(
  path: string,
  options: { json?: unknown; cookie?: string; query?: string } = {},
): Promise<{ status: number; body: unknown; setCookie: string[] }> {
  const url = `${ORIGIN}/api/auth${path}${options.query ?? ""}`;
  const headers: Record<string, string> = {
    origin: ORIGIN,
    "x-forwarded-for": uniqueTestIp(),
  };
  if (options.json !== undefined) headers["content-type"] = "application/json";
  if (options.cookie) headers.cookie = options.cookie;

  const response = await auth.handler(
    new Request(url, {
      method: "POST",
      headers,
      body: options.json === undefined ? undefined : JSON.stringify(options.json),
    }),
  );

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body, setCookie: response.headers.getSetCookie() };
}

/** True when `password` really signs the account in. */
async function passwordWorks(email: string, password: string): Promise<boolean> {
  const response = await auth.handler(
    new Request(`${ORIGIN}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        "x-forwarded-for": uniqueTestIp(),
      },
      body: JSON.stringify({ email, password }),
    }),
  );
  return response.status === 200;
}

/** The role column as stored. `null` when the row is gone. */
async function roleOf(userId: string): Promise<string | null> {
  return (await findUser(userId))?.role ?? null;
}

describeAuth("admin endpoint guard — through the real better-auth handler", () => {
  beforeAll(() => {
    // Fail loudly rather than silently testing a mis-mounted handler.
    expect(typeof auth.handler).toBe("function");
  });

  afterAll(async () => {
    await cleanupFixture({
      userIds: created.map((u) => u.id),
      emails: created.map((u) => u.email),
    });
    await closeDb();
  });

  /* ------------------------------------------------------------------ */
  /* Objective 2 — the two escalation paths                             */
  /* ------------------------------------------------------------------ */

  it("denies an ADMIN resetting an OWNER's password, and leaves it unchanged", async () => {
    const admin = await makeUser("admin");
    const owner = await makeUser("owner");

    const response = await callAdmin("/admin/set-user-password", {
      json: { userId: owner.id, newPassword: ROTATED },
      cookie: admin.cookie,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    // The decisive assertion: the credential still works, so no write happened.
    expect(await passwordWorks(owner.email, PASSWORD)).toBe(true);
    expect(await passwordWorks(owner.email, ROTATED)).toBe(false);
  });

  it("denies an ADMIN listing an OWNER's sessions, and returns no tokens", async () => {
    const admin = await makeUser("admin");
    const owner = await makeUser("owner");

    const response = await callAdmin("/admin/list-user-sessions", {
      json: { userId: owner.id },
      cookie: admin.cookie,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    // No session material may leak through a denial, in the body OR a cookie.
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("token");
    expect(response.setCookie).toHaveLength(0);
  });

  /* ------------------------------------------------------------------ */
  /* Objective 2 — the owner's INTENDED powers must still work          */
  /* ------------------------------------------------------------------ */

  it("allows an OWNER to reset an ADMIN's password", async () => {
    const owner = await makeUser("owner");
    const target = await makeUser("admin");

    const response = await callAdmin("/admin/set-user-password", {
      json: { userId: target.id, newPassword: ROTATED },
      cookie: owner.cookie,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await passwordWorks(target.email, ROTATED)).toBe(true);
  });

  it("allows an OWNER to list an ADMIN's sessions", async () => {
    const owner = await makeUser("owner");
    const target = await makeUser("admin");

    const response = await callAdmin("/admin/list-user-sessions", {
      json: { userId: target.id },
      cookie: owner.cookie,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
  });

  it("still allows an ADMIN to reset a CUSTOMER's password", async () => {
    const admin = await makeUser("admin");
    const target = await makeUser("user");

    const response = await callAdmin("/admin/set-user-password", {
      json: { userId: target.id, newPassword: ROTATED },
      cookie: admin.cookie,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await passwordWorks(target.email, ROTATED)).toBe(true);
  });

  /* ------------------------------------------------------------------ */
  /* Unauthenticated callers                                            */
  /* ------------------------------------------------------------------ */

  it("rejects unauthenticated callers on every privileged endpoint", async () => {
    const target = await makeUser("user");

    const endpoints: [string, unknown][] = [
      ["/admin/set-user-password", { userId: target.id, newPassword: ROTATED }],
      ["/admin/list-user-sessions", { userId: target.id }],
      ["/admin/set-role", { userId: target.id, role: "owner" }],
      ["/admin/ban-user", { userId: target.id }],
    ];

    for (const [path, json] of endpoints) {
      const response = await callAdmin(path, { json });
      expect(response.status, `${path} → ${JSON.stringify(response.body)}`).toBe(
        401,
      );
    }

    // And nothing happened.
    expect(await passwordWorks(target.email, PASSWORD)).toBe(true);
    expect(await roleOf(target.id)).toBe("user");
  });

  /* ------------------------------------------------------------------ */
  /* Existing protections must not regress                              */
  /* ------------------------------------------------------------------ */

  it("still denies an ADMIN a role change, and still allows the OWNER one", async () => {
    const admin = await makeUser("admin");
    const target = await makeUser("user");

    const denied = await callAdmin("/admin/set-role", {
      json: { userId: target.id, role: "owner" },
      cookie: admin.cookie,
    });
    expect(denied.status, JSON.stringify(denied.body)).toBe(403);
    expect(await roleOf(target.id)).toBe("user");

    const owner = await makeUser("owner");
    const allowed = await callAdmin("/admin/set-role", {
      json: { userId: target.id, role: "owner" },
      cookie: owner.cookie,
    });
    expect(allowed.status, JSON.stringify(allowed.body)).toBe(200);
    expect(await roleOf(target.id)).toBe("owner");
  });

  it("still denies an ADMIN banning an OWNER, and still allows banning a CUSTOMER", async () => {
    const admin = await makeUser("admin");
    const owner = await makeUser("owner");
    const customer = await makeUser("user");

    const denied = await callAdmin("/admin/ban-user", {
      json: { userId: owner.id, banReason: "coup" },
      cookie: admin.cookie,
    });
    expect(denied.status, JSON.stringify(denied.body)).toBe(403);
    expect((await findUser(owner.id))?.banned).toBe(false);

    const allowed = await callAdmin("/admin/ban-user", {
      json: { userId: customer.id, banReason: "spam" },
      cookie: admin.cookie,
    });
    expect(allowed.status, JSON.stringify(allowed.body)).toBe(200);
    expect((await findUser(customer.id))?.banned).toBe(true);
  });

  it("still refuses an actor acting on its own account", async () => {
    const owner = await makeUser("owner");

    const response = await callAdmin("/admin/set-user-password", {
      json: { userId: owner.id, newPassword: ROTATED },
      cookie: owner.cookie,
    });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(await passwordWorks(owner.email, PASSWORD)).toBe(true);
  });

  /* ------------------------------------------------------------------ */
  /* Bypass attempts — the guard must key on the BODY it will read      */
  /* ------------------------------------------------------------------ */

  it("cannot be bypassed by moving the target into the query string", async () => {
    // The guard reads `body.userId`, and so does the endpoint's own schema. A
    // query-string userId must therefore be ignored by BOTH — the request is
    // malformed, and crucially no write happens.
    const admin = await makeUser("admin");
    const owner = await makeUser("owner");

    const response = await callAdmin("/admin/set-user-password", {
      json: { newPassword: ROTATED },
      cookie: admin.cookie,
      query: `?userId=${encodeURIComponent(owner.id)}`,
    });

    expect([400, 403]).toContain(response.status);
    expect(await passwordWorks(owner.email, PASSWORD)).toBe(true);
  });

  it("cannot be bypassed by a trailing slash on the path", async () => {
    const admin = await makeUser("admin");
    const owner = await makeUser("owner");

    const response = await callAdmin("/admin/set-user-password/", {
      json: { userId: owner.id, newPassword: ROTATED },
      cookie: admin.cookie,
    });

    // Either the router 404s it, or it reaches the guard — never a 200 write.
    expect(response.status).not.toBe(200);
    expect(await passwordWorks(owner.email, PASSWORD)).toBe(true);
  });
});
