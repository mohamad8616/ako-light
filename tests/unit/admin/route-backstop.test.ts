/**
 * Pass 11.5B — §4 (admin route protection): the React-tree backstop.
 *
 * `proxy.ts` performs the fast edge gate (covered in tests/unit/proxy.test.ts).
 * This file covers the OTHER half of the same boundary: the gate the admin
 * route group actually renders through — `app/[locale]/(admin)/layout.tsx`
 * calls `await requireAdminAccess()` before any page below it can render.
 *
 * Why both are tested separately: the proxy rule lives outside the React tree
 * and is the piece "easiest to regress silently" (its own header says so). If
 * the edge rule were ever loosened, this layout gate is the guaranteed
 * backstop — so a page rendered without the required role must redirect
 * instead of leaking. If this backstop were removed while the proxy stayed
 * green, every denial test in the suite would still pass, so it needs its own
 * assertions.
 *
 * Contract under test (lib/admin/access.ts):
 *   - no session        → redirect("/sign-in?denied=1")
 *   - role "user"       → redirect("/sign-in?denied=1")   (signed in, not staff)
 *   - role "admin"      → returns "admin"
 *   - role "owner"      → returns "owner"
 *   - any other/unknown role → treated as non-admin → "/sign-in?denied=1"
 *
 * `getAdminRole()` is the shared resolver: it maps the session's stored role
 * onto ADMIN_ROLES and returns undefined for anything else. Proving it returns
 * undefined for a `user` (not a falsey-but-present value) is what makes the
 * redirect branch correct rather than accidental.
 *
 * Unit tier: hermetic — auth + next/* mocked, permissions.ts imported for real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { getAdminRole, requireAdminAccess } from "@/lib/admin/access";

const DENIED = "/sign-in?denied=1";

describe("requireAdminAccess — React-tree route backstop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    redirectMock.mockImplementation(((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`) as Error & {
        digest: string;
      };
      error.digest = `NEXT_REDIRECT;replace;${url};307;`;
      throw error;
    }) as never);
  });

  it("an anonymous visitor is denied and sent to the sign-in page", async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(requireAdminAccess()).rejects.toThrow(`NEXT_REDIRECT:${DENIED}`);
    expect(redirectMock).toHaveBeenCalledWith(DENIED);
  });

  it("a plain USER is denied and sent to the sign-in page", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "user" } });
    await expect(requireAdminAccess()).rejects.toThrow(`NEXT_REDIRECT:${DENIED}`);
    expect(redirectMock).toHaveBeenCalledWith(DENIED);
  });

  it("an ADMIN passes the backstop and is handed back their rank", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
    await expect(requireAdminAccess()).resolves.toBe("admin");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("an OWNER passes the backstop and is handed back their rank", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "owner" } });
    await expect(requireAdminAccess()).resolves.toBe("owner");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("an unrecognized role is treated as non-admin (fail closed)", async () => {
    // A role value the app does not know (e.g. written by an out-of-band DB
    // change) must NOT be treated as admin. Fail closed: redirect.
    mockGetSession.mockResolvedValue({ user: { role: "superuser" } });
    await expect(requireAdminAccess()).rejects.toThrow(`NEXT_REDIRECT:${DENIED}`);
    expect(redirectMock).toHaveBeenCalledWith(DENIED);
  });

  it("a session with no role field at all is denied", async () => {
    mockGetSession.mockResolvedValue({ user: {} });
    await expect(requireAdminAccess()).rejects.toThrow(`NEXT_REDIRECT:${DENIED}`);
  });
});

describe("getAdminRole — role resolution behind the backstop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
  });

  it("returns undefined when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(getAdminRole()).resolves.toBeUndefined();
  });

  it("returns undefined for a plain user (present-but-non-admin, not a falsey hole)", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "user" } });
    await expect(getAdminRole()).resolves.toBeUndefined();
  });

  it("returns the role for an admin and for an owner", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
    await expect(getAdminRole()).resolves.toBe("admin");

    mockGetSession.mockResolvedValue({ user: { role: "owner" } });
    await expect(getAdminRole()).resolves.toBe("owner");
  });

  it("never treats an unknown role as admin-level", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "moderator" } });
    await expect(getAdminRole()).resolves.toBeUndefined();
  });
});
