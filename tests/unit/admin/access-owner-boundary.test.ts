/**
 * Step 3 — owner-only boundary.
 *
 * Backend reality (verified by search before writing this file):
 *   - NO lib/admin/actions/admins/* or any user-management backend exists.
 *     The admins section is a UI placeholder: a nav entry
 *     (ADMIN_OWNER_NAV -> "/admin/admins", owner-visible only) plus the
 *     `requireOwnerAccess()` gate helper in lib/admin/access.ts.
 *   - The only owner-vs-admin difference enforced anywhere is the
 *     `impersonate-admins` permission in lib/auth/permissions.ts (owner has
 *     it, admin does not).
 *
 * So this file tests the boundary that DOES exist rather than inventing
 * backend that isn't there:
 *   1. `requireOwnerAccess()` with an `admin`-role session rejects by
 *      redirecting to "/admin" (NOT the sign-in page — the caller IS signed
 *      in and authorized for the shell, just not owner-rank).
 *   2. `requireOwnerAccess()` with a `user` session and with no session
 *      rejects via redirect("/sign-in?denied=1").
 *   3. `requireOwnerAccess()` with an `owner` session returns "owner".
 *   4. Permission matrix: ownerRole carries `impersonate-admins`, adminRole
 *      does not, and userRole carries no admin-plugin permissions — i.e. an
 *      `admin` session cannot invoke whatever the eventual admins/user-
 *      management actions will gate behind owner rank.
 *
 * Unit tier: hermetic — auth + next/* mocked, permissions.ts imported for
 * real (it is Prisma-free by design, see its header comment).
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

import { requireOwnerAccess } from "@/lib/admin/access";
import {
  ALL_ROLES,
  ADMIN_ROLES,
  ROLES,
  adminRole,
  ownerRole,
  rolePermissions,
  userRole,
} from "@/lib/auth/permissions";

describe("requireOwnerAccess — owner-only boundary", () => {
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

  it("an admin-role session CANNOT invoke owner-gated logic (bounced to /admin)", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
    await expect(requireOwnerAccess()).rejects.toThrow("NEXT_REDIRECT:/admin");
    expect(redirectMock).toHaveBeenCalledWith("/admin");
    expect(redirectMock).not.toHaveBeenCalledWith("/sign-in?denied=1");
  });

  it("a user-role session is sent to sign-in, not the dashboard", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "user" } });
    await expect(requireOwnerAccess()).rejects.toThrow(
      "NEXT_REDIRECT:/sign-in?denied=1",
    );
    expect(redirectMock).toHaveBeenCalledWith("/sign-in?denied=1");
  });

  it("no session at all is sent to sign-in", async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(requireOwnerAccess()).rejects.toThrow(
      "NEXT_REDIRECT:/sign-in?denied=1",
    );
    expect(redirectMock).toHaveBeenCalledWith("/sign-in?denied=1");
  });

  it("an owner-role session passes and returns owner rank", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "owner" } });
    await expect(requireOwnerAccess()).resolves.toBe("owner");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("owner-vs-admin permission matrix (impersonate-admins)", () => {
  it("locks in the three role names and admin-level membership", () => {
    expect(ROLES).toEqual({ user: "user", admin: "admin", owner: "owner" });
    expect([...ADMIN_ROLES]).toEqual(["admin", "owner"]);
    expect([...ALL_ROLES]).toEqual(["user", "admin", "owner"]);
  });

  it("only the owner role carries impersonate-admins", () => {
    expect(JSON.stringify(ownerRole)).toContain("impersonate-admins");
    expect(JSON.stringify(adminRole)).not.toContain("impersonate-admins");
  });

  it("the user role carries no admin-plugin permissions", () => {
    expect(JSON.stringify(userRole)).not.toContain("impersonate");
    expect(JSON.stringify(userRole)).not.toContain("impersonate-admins");
  });

  it("the role map wires each name to its role definition", () => {
    expect(rolePermissions[ROLES.user]).toBe(userRole);
    expect(rolePermissions[ROLES.admin]).toBe(adminRole);
    expect(rolePermissions[ROLES.owner]).toBe(ownerRole);
  });
});
