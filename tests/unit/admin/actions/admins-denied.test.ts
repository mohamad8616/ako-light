/**
 * Direct-call IDOR coverage for owner-only user-management server actions.
 * An `admin` session passes the admin shell, but must be rejected by every
 * mutation on `/admin/admins` before any user lookup or database write.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const repoMocks = vi.hoisted(() => ({
  getUserRole: vi.fn(),
  setUserRole: vi.fn(),
  setUserBanned: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/repositories/admin-users", () => ({
  getUserRole: repoMocks.getUserRole,
  setUserRole: repoMocks.setUserRole,
  setUserBanned: repoMocks.setUserBanned,
}));

import {
  setUserBannedAction,
  setUserRoleAction,
} from "@/lib/admin/actions/admins";

const ADMIN = { id: "admin-1", role: "admin" };
const TARGET = "target-user";

describe("owner-only user-management actions reject admin sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue({ user: ADMIN });
    redirectMock.mockImplementation(((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`);
      throw error;
    }) as never);
  });

  it.each(["user", "admin", "owner"] as const)(
    "rejects an admin trying to assign %s",
    async (role) => {
      await expect(setUserRoleAction({ userId: TARGET, role })).rejects.toThrow(
        "NEXT_REDIRECT:/admin",
      );
      expect(redirectMock).toHaveBeenCalledWith("/admin");
      expect(repoMocks.getUserRole).not.toHaveBeenCalled();
      expect(repoMocks.setUserRole).not.toHaveBeenCalled();
      expect(repoMocks.setUserBanned).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    "rejects an admin trying to set banned=%s",
    async (banned) => {
      await expect(
        setUserBannedAction({ userId: TARGET, banned }),
      ).rejects.toThrow("NEXT_REDIRECT:/admin");
      expect(redirectMock).toHaveBeenCalledWith("/admin");
      expect(repoMocks.getUserRole).not.toHaveBeenCalled();
      expect(repoMocks.setUserRole).not.toHaveBeenCalled();
      expect(repoMocks.setUserBanned).not.toHaveBeenCalled();
    },
  );
});
