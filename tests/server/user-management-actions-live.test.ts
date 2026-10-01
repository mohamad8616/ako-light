/**
 * Pass 11.5C — the owner-only user-management ACTIONS, driven by REAL sessions
 * against the REAL database.
 *
 * Why this file exists: `tests/unit/admin/actions/admins-management.test.ts`
 * mocks BOTH the session and the repository, so it proves the action's
 * branching but can never prove that a real signed-in session reaches the real
 * gate and that the real `user.role` column ends up correct. This is the one
 * surface where "the code looks right" is not sufficient — a wrong gate here is
 * privilege escalation, not a UI bug.
 *
 * Everything below `next/headers` is production code:
 *   - the session cookie is minted by the real `auth.api.signInEmail`, so the
 *     signature, the `session` row and the role payload are all real;
 *   - `requireOwnerAccess()` resolves it through the real `auth.api.getSession`;
 *   - the zod parse, the transition rules and the conditional role write run
 *     for real, and every assertion reads `user.role` back out of Postgres.
 *
 * `next/headers` is stubbed because a Server Action receives its request
 * through `headers()` and there is no request here. It is replaced WHOLESALE,
 * never with `importOriginal()`: loading the real module pulls Next's
 * app-render internals, which throw
 * `Invariant: AsyncLocalStorage accessed in runtime where it is not available`
 * outside the Next runtime and kill the worker.
 *
 * The HTTP half of this feature — what the server actually RENDERS for an owner
 * and how it refuses an admin — lives in
 * `tests/integration/auth/user-management-ui.test.ts`, which mocks nothing. The
 * two are split because stubbing `next/headers` in a worker that has also
 * booted Next makes the app's own auth endpoints return 500.
 *
 * Part of the `server` Vitest project (vitest.config.ts).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * The session under test, as the Server Action would receive it. Pointing this
 * at a real signed-in cookie is what makes `requireOwnerAccess()` run for real.
 */
const hoisted = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  redirects: [] as string[],
}));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers(hoisted.cookie ? { cookie: hoisted.cookie } : {}),
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    has: () => false,
    set: () => undefined,
    delete: () => undefined,
  }),
}));

/**
 * `redirect()` must throw, exactly as Next's real implementation does: the
 * actions call it from OUTSIDE their try/catch precisely so a refusal aborts
 * the call instead of being swallowed into an ActionResult.
 */
vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    hoisted.redirects.push(url);
    const error = new Error(`NEXT_REDIRECT:${url}`) as Error & {
      digest: string;
    };
    error.digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw error;
  },
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), refresh: vi.fn() }));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getAdminDictionary } from "@/lib/i18n/admin-translations";
import {
  setUserBannedAction,
  setUserRoleAction,
} from "@/lib/admin/actions/admins";

const PASSWORD = "correct-horse-battery-staple";

/** Every account this file created, so `afterAll` can guarantee a clean DB. */
const createdIds: string[] = [];

/** `Set-Cookie` values → a single `Cookie:` header. */
function cookieFrom(response: Response): string {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
  return raw
    .filter(Boolean)
    .map((entry) => entry.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

/**
 * Creates an account with the given stored role and signs it in, returning a
 * real session cookie.
 *
 * The role is written BEFORE sign-in because better-auth caches the session
 * payload in the signed cookie — writing it afterwards would leave the cookie
 * carrying the old role.
 */
async function liveSession(
  role: "user" | "admin" | "owner",
): Promise<{ id: string; email: string; cookie: string }> {
  const email = `umtest-${randomUUID()}@example.test`;

  const signUp = await auth.api.signUpEmail({
    body: { email, password: PASSWORD, name: `UM ${role}` },
    asResponse: true,
  });
  expect(signUp.status, `sign-up failed for ${email}`).toBe(200);

  const row = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  createdIds.push(row.id);

  await prisma.user.update({ where: { id: row.id }, data: { role } });

  const signIn = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  expect(signIn.status, `sign-in failed for ${email}`).toBe(200);

  const cookie = cookieFrom(signIn);
  expect(cookie, "sign-in must produce a session cookie").toContain(
    "session_token",
  );

  return { id: row.id, email, cookie };
}

/** The role currently stored for a user id — read straight from Postgres. */
async function storedRole(userId: string): Promise<string | undefined> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return row?.role;
}

/** A plain account with no role change — the promotion target. */
async function freshTarget(): Promise<{ id: string; email: string }> {
  const email = `umtest-${randomUUID()}@example.test`;
  const signUp = await auth.api.signUpEmail({
    body: { email, password: PASSWORD, name: "UM Target" },
    asResponse: true,
  });
  expect(signUp.status, `sign-up failed for ${email}`).toBe(200);

  const row = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  createdIds.push(row.id);
  return { id: row.id, email };
}

describe("owner-only user management — live actions against the real DB", () => {
  afterAll(async () => {
    if (createdIds.length > 0) {
      // Session/Account cascade on user delete (prisma/schema.prisma).
      await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.$disconnect();
  });

  it("1. signs in as owner and the real session carries the owner role", async () => {
    const owner = await liveSession("owner");
    hoisted.cookie = owner.cookie;

    // Resolve the session the way the gate does — through the real API, with
    // the real cookie. This is the exact call `requireOwnerAccess()` makes.
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: owner.cookie }),
    });
    expect(session?.user?.id).toBe(owner.id);
    expect(session?.user?.role).toBe("owner");
    expect(await storedRole(owner.id)).toBe("owner");
  });

  it("2. promotes a real test user to admin and persists the new role", async () => {
    const owner = await liveSession("owner");
    const target = await freshTarget();
    expect(await storedRole(target.id)).toBe("user");

    hoisted.cookie = owner.cookie;
    const result = await setUserRoleAction({ userId: target.id, role: "admin" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(
      await storedRole(target.id),
      "the promotion must be persisted",
    ).toBe("admin");
  });

  it("3. refuses the owner's own demotion with a VISIBLE structured error and no write", async () => {
    const owner = await liveSession("owner");
    hoisted.cookie = owner.cookie;
    hoisted.redirects.length = 0;

    const result = await setUserRoleAction({
      userId: owner.id,
      role: "user",
    });

    // Not a silent success and not a thrown error: a structured, translatable
    // failure that the UI turns into an error toast on the offending row.
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.formError).toBe("selfTarget");
    expect(result.issues).toContainEqual({
      field: "userId",
      code: "selfTarget",
    });

    // A refusal must be a refusal: the row is untouched, and no redirect
    // happened (the caller IS an owner, so the gate let them through and the
    // self-target rule is what stopped the write).
    expect(await storedRole(owner.id)).toBe("owner");
    expect(hoisted.redirects).toEqual([]);
  });

  it("3b. the self-protection copy exists in BOTH locales (no raw-key toast)", async () => {
    for (const lang of ["en", "fa"] as const) {
      // Admin copy lives in the ADMIN dictionary, not the public barrel —
      // reading it from getAdminDictionary is also what keeps this test
      // honest about which module owns the strings.
      const dict = getAdminDictionary(lang);
      const message = dict["admin.error.selfTarget"];
      expect(message, `${lang}: admin.error.selfTarget`).toBeTruthy();
      expect(message, `${lang}: must not leak the raw key`).not.toBe(
        "admin.error.selfTarget",
      );
      // The note the owner's own row renders in place of a role select.
      expect(
        dict["admin.admins.self.hint"],
        `${lang}: admin.admins.self.hint`,
      ).toBeTruthy();
    }
  });

  it("4. demotes the test admin back to user", async () => {
    const owner = await liveSession("owner");
    const target = await freshTarget();

    hoisted.cookie = owner.cookie;

    expect(
      await setUserRoleAction({ userId: target.id, role: "admin" }),
    ).toEqual({ ok: true, data: undefined });
    expect(await storedRole(target.id)).toBe("admin");

    expect(
      await setUserRoleAction({ userId: target.id, role: "user" }),
    ).toEqual({ ok: true, data: undefined });
    expect(
      await storedRole(target.id),
      "the demotion must be persisted",
    ).toBe("user");
  });

  it("5. REFUSES an admin-role session calling the actions directly", async () => {
    const admin = await liveSession("admin");
    const target = await freshTarget();

    // Sanity: the session really is admin-level, so the refusal below is the
    // owner gate — not a broken or anonymous session.
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: admin.cookie }),
    });
    expect(session?.user?.role).toBe("admin");

    hoisted.cookie = admin.cookie;
    hoisted.redirects.length = 0;

    // A direct call — the "hiding the nav entry is not authorization" case.
    await expect(
      setUserRoleAction({ userId: target.id, role: "admin" }),
    ).rejects.toThrow(/NEXT_REDIRECT/);

    expect(
      hoisted.redirects,
      "an admin must be bounced back to the dashboard",
    ).toEqual(["/admin"]);
    expect(
      await storedRole(target.id),
      "the refused call must not have written anything",
    ).toBe("user");

    // The same gate guards the ban action.
    hoisted.redirects.length = 0;
    await expect(
      setUserBannedAction({ userId: target.id, banned: true }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(hoisted.redirects).toEqual(["/admin"]);

    const banned = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
      select: { banned: true },
    });
    expect(banned.banned, "the refused ban must not have written").toBe(false);
  });

  it("5b. REFUSES a plain user session calling the actions directly", async () => {
    const user = await liveSession("user");
    const target = await freshTarget();

    hoisted.cookie = user.cookie;
    hoisted.redirects.length = 0;

    await expect(
      setUserRoleAction({ userId: target.id, role: "admin" }),
    ).rejects.toThrow(/NEXT_REDIRECT/);

    // A non-admin is sent to sign-in with the denied marker, not to the
    // dashboard — they cannot use the shell at all.
    expect(hoisted.redirects).toEqual(["/sign-in?denied=1"]);
    expect(await storedRole(target.id)).toBe("user");
  });

  it("6. refuses a user -> owner jump, even for an owner caller", async () => {
    const owner = await liveSession("owner");
    const target = await freshTarget();

    hoisted.cookie = owner.cookie;
    hoisted.redirects.length = 0;

    // The permitted set is user->admin, admin->user and admin->owner. A plain
    // user can never be jumped straight to owner, which keeps the top role
    // reachable only through the intermediate admin step.
    const result = await setUserRoleAction({ userId: target.id, role: "owner" });

    expect(result.ok).toBe(false);
    expect(
      await storedRole(target.id),
      "the refused transition must not have written",
    ).toBe("user");
  });

  it("7. allows the documented admin -> owner promotion", async () => {
    const owner = await liveSession("owner");
    const admin = await liveSession("admin");

    hoisted.cookie = owner.cookie;

    expect(
      await setUserRoleAction({ userId: admin.id, role: "owner" }),
    ).toEqual({ ok: true, data: undefined });
    expect(await storedRole(admin.id)).toBe("owner");
  });
});
