/**
 * Pass 12.5A — `/admin/admins` owner-only user management.
 *
 * Covers the authorization boundary AND the role-safety rules the plan calls
 * out, at the layer where they are actually enforced: the server actions.
 *
 * Backend reality (verified before writing this file):
 *   - `requireOwnerAccess()` (lib/admin/access.ts) bounces an `admin` to
 *     `/admin` and an anonymous/`user` caller to `/sign-in?denied=1`.
 *   - better-auth's own `/admin/set-role` endpoint authorizes on `adminRoles`
 *     membership, and an `admin` IS admin-level — so the plugin alone would let
 *     an admin change roles. The project requires OWNER-only role changes,
 *     which is why the actions run `requireOwnerAccess()` themselves. These
 *     tests pin exactly that: an ADMIN never reaches the repository.
 *
 * Hermetic unit tier: auth + next/* + the repository + result-server are
 * mocked; the schemas and the access helpers are imported for real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const toActionResultMock = vi.hoisted(() => vi.fn());

const repoMocks = vi.hoisted(() => ({
  getAdminUserRows: vi.fn(),
  getUserRole: vi.fn(),
  setUserRole: vi.fn(),
  setUserBanned: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  refresh: refreshMock,
}));
vi.mock("@/lib/admin/result-server", () => ({
  toActionResult: toActionResultMock,
}));
vi.mock("@/lib/repositories/admin-users", () => ({
  getAdminUserRows: repoMocks.getAdminUserRows,
  getUserRole: repoMocks.getUserRole,
  setUserRole: repoMocks.setUserRole,
  setUserBanned: repoMocks.setUserBanned,
}));

import {
  setUserBannedAction,
  setUserRoleAction,
} from "@/lib/admin/actions/admins";
import { ADMIN_OWNER_NAV } from "@/lib/admin/sections";
import { translations, type TranslationKey } from "@/lib/i18n/translations";

const OWNER = { id: "owner-1", role: "owner" };
const ADMIN = { id: "admin-1", role: "admin" };
const USER = { id: "user-1", role: "user" };
const TARGET = "target-9";

const DENIED_URL = "/sign-in?denied=1";

describe("owner-only user-management actions", () => {
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
    for (const fn of Object.values(repoMocks)) fn.mockResolvedValue(undefined);
    repoMocks.getUserRole.mockResolvedValue({ role: "user" });
    repoMocks.setUserRole.mockResolvedValue(true);
  });

  function expectNothingWritten() {
    expect(repoMocks.setUserRole.mock.calls).toHaveLength(0);
    expect(repoMocks.setUserBanned.mock.calls).toHaveLength(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  }

  /* --------------------------------------------------------------------- */
  /* §4 / §5 — non-owner is denied, and NOTHING is written                  */
  /* --------------------------------------------------------------------- */

  it("a plain USER cannot promote or demote (sent to sign-in)", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    await expect(
      setUserRoleAction({ userId: TARGET, role: "admin" }),
    ).rejects.toThrow(`NEXT_REDIRECT:${DENIED_URL}`);
    await expect(
      setUserBannedAction({ userId: TARGET, banned: true }),
    ).rejects.toThrow(`NEXT_REDIRECT:${DENIED_URL}`);
    expectNothingWritten();
  });

  it("an anonymous caller cannot promote or ban (sent to sign-in)", async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(
      setUserRoleAction({ userId: TARGET, role: "admin" }),
    ).rejects.toThrow(`NEXT_REDIRECT:${DENIED_URL}`);
    await expect(
      setUserBannedAction({ userId: TARGET, banned: true }),
    ).rejects.toThrow(`NEXT_REDIRECT:${DENIED_URL}`);
    expectNothingWritten();
  });

  /* --------------------------------------------------------------------- */
  /* §3 — OWNER can promote USER → ADMIN and demote ADMIN → USER            */
  /* --------------------------------------------------------------------- */

  it("an OWNER promotes a user to admin", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    await expect(
      setUserRoleAction({ userId: TARGET, role: "admin" }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(repoMocks.setUserRole).toHaveBeenCalledWith(TARGET, "user", "admin");
    expect(revalidatePathMock).toHaveBeenCalled();
  });

  it("an OWNER demotes an admin to user", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    repoMocks.getUserRole.mockResolvedValue({ role: "admin" });
    await expect(
      setUserRoleAction({ userId: TARGET, role: "user" }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(repoMocks.setUserRole).toHaveBeenCalledWith(TARGET, "admin", "user");
  });

  it("an OWNER promotes an admin to owner", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    repoMocks.getUserRole.mockResolvedValue({ role: "admin" });
    await expect(
      setUserRoleAction({ userId: TARGET, role: "owner" }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(repoMocks.setUserRole).toHaveBeenCalledWith(TARGET, "admin", "owner");
  });

  it("an OWNER can ban and unban another user", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    await setUserBannedAction({ userId: TARGET, banned: true });
    expect(repoMocks.setUserBanned).toHaveBeenCalledWith(TARGET, true);
    await setUserBannedAction({ userId: TARGET, banned: false });
    expect(repoMocks.setUserBanned).toHaveBeenLastCalledWith(TARGET, false);
  });

  /* --------------------------------------------------------------------- */
  /* §5 — OWNER cannot remove or downgrade their OWN privileges             */
  /* --------------------------------------------------------------------- */

  it("an OWNER cannot change their own role (no write)", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    const result = await setUserRoleAction({
      userId: OWNER.id,
      role: "user",
    });
    expect(result).toMatchObject({
      ok: false,
      formError: "selfTarget",
      issues: [{ field: "userId", code: "selfTarget" }],
    });
    expect(repoMocks.setUserRole.mock.calls).toHaveLength(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("an OWNER cannot ban themselves (no write)", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    const result = await setUserBannedAction({
      userId: OWNER.id,
      banned: true,
    });
    expect(result.ok).toBe(false);
    expect(repoMocks.setUserBanned.mock.calls).toHaveLength(0);
  });

  /* --------------------------------------------------------------------- */
  /* §6 — validation: invalid ids and role values are rejected before write */
  /* --------------------------------------------------------------------- */

  it("rejects user -> owner and owner -> user transitions", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    const directOwnerGrant = await setUserRoleAction({
      userId: TARGET,
      role: "owner",
    });
    expect(directOwnerGrant.ok).toBe(false);

    repoMocks.getUserRole.mockResolvedValue({ role: "owner" });
    const ownerDemotion = await setUserRoleAction({ userId: TARGET, role: "user" });
    expect(ownerDemotion.ok).toBe(false);
    expectNothingWritten();
  });

  it("rejects an empty / over-long user id before touching the repository", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    const empty = await setUserRoleAction({ userId: "", role: "admin" });
    expect(empty.ok).toBe(false);

    const overlong = await setUserRoleAction({
      userId: "x".repeat(5000),
      role: "admin",
    });
    expect(overlong.ok).toBe(false);
    expectNothingWritten();
  });

  it("rejects a non-boolean banned flag", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    const result = await setUserBannedAction({
      userId: TARGET,
      banned: "yes" as never,
    });
    expect(result.ok).toBe(false);
    expect(repoMocks.setUserBanned.mock.calls).toHaveLength(0);
  });
});

describe("the owners' nav + dictionary wiring", () => {
  it("keeps /admin/admins as the single owner nav item", () => {
    expect(ADMIN_OWNER_NAV.map((item) => item.href)).toEqual(["/admin/admins"]);
  });

  it("has translations for every admins-screen key in BOTH dictionaries", () => {
    const keys = Object.keys(translations.en).filter(
      (key): key is TranslationKey => key.startsWith("admin.admins."),
    );
    // A representative, non-trivial set (the screen renders all of these).
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) {
      expect(translations.en[key], `en:${key}`).toBeTruthy();
      expect(translations.fa[key], `fa:${key}`).toBeTruthy();
    }
    expect(translations.en["admin.section.admins.description"]).toBeTruthy();
  });
});
