/**
 * `/admin/users` server actions — the authorization boundary.
 *
 * These prove where the rules are actually ENFORCED (not just where the UI
 * hides a button):
 *
 *   - an admin may ban/unban a customer, but is refused role changes;
 *   - a customer and an anonymous caller are sent to sign-in;
 *   - an owner may change roles within the authority table;
 *   - the target's role is re-read from the repository, never trusted from the
 *     request, so a forged payload cannot claim a lower target role;
 *   - a refusal writes NOTHING.
 *
 * Hermetic: auth + next/* + the repository + result-server are mocked; the
 * schemas, the access helpers and the capability module are imported for real
 * (that is the code under test).
 *
 * Part of the `unit` Vitest project.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const toActionResultMock = vi.hoisted(() => vi.fn());

const repoMocks = vi.hoisted(() => ({
  getUserDirectoryTarget: vi.fn(),
}));

const adminRepoMocks = vi.hoisted(() => ({
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
vi.mock("@/lib/repositories/user-directory", () => ({
  getUserDirectoryTarget: repoMocks.getUserDirectoryTarget,
}));
vi.mock("@/lib/repositories/admin-users", () => ({
  setUserRole: adminRepoMocks.setUserRole,
  setUserBanned: adminRepoMocks.setUserBanned,
}));

import {
  setDirectoryBannedAction,
  setDirectoryRoleAction,
} from "@/lib/admin/actions/user-directory";
import type { UserDirectoryRow } from "@/lib/repositories/user-directory";

const OWNER = { id: "owner-1", role: "owner" };
const ADMIN = { id: "admin-1", role: "admin" };
const USER = { id: "user-1", role: "user" };
const DENIED_URL = "/sign-in?denied=1";

function targetRow(overrides: Partial<UserDirectoryRow> = {}): UserDirectoryRow {
  return {
    id: "cust-1",
    name: "Customer",
    email: "cust@example.test",
    role: "user",
    phoneNumber: null,
    banned: false,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("/admin/users server actions", () => {
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
    repoMocks.getUserDirectoryTarget.mockResolvedValue(targetRow());
    adminRepoMocks.setUserBanned.mockResolvedValue(undefined);
    adminRepoMocks.setUserRole.mockResolvedValue(true);
  });

  function expectNothingWritten() {
    expect(adminRepoMocks.setUserBanned.mock.calls).toHaveLength(0);
    expect(adminRepoMocks.setUserRole.mock.calls).toHaveLength(0);
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  }

  /* ---------------------------------------------------------------- */
  /* Access gate                                                       */
  /* ---------------------------------------------------------------- */

  it("sends a plain customer and an anonymous caller to sign-in (no write)", async () => {
    mockGetSession.mockResolvedValue({ user: USER });
    await expect(
      setDirectoryBannedAction({ userId: "cust-1", banned: true }),
    ).rejects.toThrow(`NEXT_REDIRECT:${DENIED_URL}`);
    await expect(
      setDirectoryRoleAction({ userId: "cust-1", role: "admin" }),
    ).rejects.toThrow(`NEXT_REDIRECT:${DENIED_URL}`);

    mockGetSession.mockResolvedValue(null);
    await expect(
      setDirectoryBannedAction({ userId: "cust-1", banned: true }),
    ).rejects.toThrow(`NEXT_REDIRECT:${DENIED_URL}`);

    expectNothingWritten();
  });

  /* ---------------------------------------------------------------- */
  /* Moderation (ban) — admin AND owner                                */
  /* ---------------------------------------------------------------- */

  it("lets an ADMIN ban and unban a customer", async () => {
    mockGetSession.mockResolvedValue({ user: ADMIN });

    await expect(
      setDirectoryBannedAction({ userId: "cust-1", banned: true }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(adminRepoMocks.setUserBanned).toHaveBeenCalledWith("cust-1", true);

    await expect(
      setDirectoryBannedAction({ userId: "cust-1", banned: false }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(adminRepoMocks.setUserBanned).toHaveBeenLastCalledWith(
      "cust-1",
      false,
    );
    expect(revalidatePathMock).toHaveBeenCalled();
  });

  it("lets an OWNER ban a customer too", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    await expect(
      setDirectoryBannedAction({ userId: "cust-1", banned: true }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(adminRepoMocks.setUserBanned).toHaveBeenCalledWith("cust-1", true);
  });

  it("refuses an admin trying to ban ANOTHER ADMIN (target higher)", async () => {
    mockGetSession.mockResolvedValue({ user: ADMIN });
    // The target is re-read from the repo — a client cannot claim it is a user.
    repoMocks.getUserDirectoryTarget.mockResolvedValue(
      targetRow({ id: "staff-2", role: "admin" }),
    );

    const result = await setDirectoryBannedAction({
      userId: "staff-2",
      banned: true,
    });
    expect(result.ok).toBe(false);
    expectNothingWritten();
  });

  /* ---------------------------------------------------------------- */
  /* Role assignment — OWNER ONLY                                      */
  /* ---------------------------------------------------------------- */

  it("REFUSES an admin changing a role, and never reads the target's role to decide", async () => {
    mockGetSession.mockResolvedValue({ user: ADMIN });

    const result = await setDirectoryRoleAction({
      userId: "cust-1",
      role: "admin",
    });

    expect(result.ok).toBe(false);
    // The refusal short-circuits BEFORE the target read and every write.
    expect(repoMocks.getUserDirectoryTarget).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("an admin is refused for EVERY role value, including a forged role=owner", async () => {
    mockGetSession.mockResolvedValue({ user: ADMIN });
    for (const role of ["user", "admin", "owner"] as const) {
      const result = await setDirectoryRoleAction({
        userId: "cust-1",
        role,
      });
      expect(result.ok, `admin assigning ${role}`).toBe(false);
    }
    // A forged POST naming an arbitrary target id is refused BEFORE the target
    // is read, so an admin cannot even probe whether an id exists.
    const forged = await setDirectoryRoleAction({
      userId: "forged-target-id",
      role: "owner",
    });
    expect(forged.ok).toBe(false);
    expect(repoMocks.getUserDirectoryTarget).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("lets an OWNER promote a customer to admin", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    await expect(
      setDirectoryRoleAction({ userId: "cust-1", role: "admin" }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(adminRepoMocks.setUserRole).toHaveBeenCalledWith(
      "cust-1",
      "user",
      "admin",
    );
  });

  it("lets an OWNER promote an admin to owner", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    repoMocks.getUserDirectoryTarget.mockResolvedValue(
      targetRow({ id: "staff-1", role: "admin" }),
    );
    await expect(
      setDirectoryRoleAction({ userId: "staff-1", role: "owner" }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(adminRepoMocks.setUserRole).toHaveBeenCalledWith(
      "staff-1",
      "admin",
      "owner",
    );
  });

  it("lets an OWNER promote a customer STRAIGHT to owner (one step)", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    // The target is a customer — promotion to owner must not require an
    // intermediate admin step.
    await expect(
      setDirectoryRoleAction({ userId: "cust-1", role: "owner" }),
    ).resolves.toEqual({ ok: true, data: undefined });
    expect(adminRepoMocks.setUserRole).toHaveBeenCalledWith(
      "cust-1",
      "user",
      "owner",
    );
  });

  it("refuses an owner DEMOTING an admin to user through this screen", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    repoMocks.getUserDirectoryTarget.mockResolvedValue(
      targetRow({ id: "staff-1", role: "admin" }),
    );
    const result = await setDirectoryRoleAction({
      userId: "staff-1",
      role: "user",
    });
    expect(result.ok).toBe(false);
    expectNothingWritten();
  });

  it("refuses an owner changing ANOTHER OWNER's role (target out of scope)", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    // getUserDirectoryTarget never returns an owner row, so this is a notFound.
    repoMocks.getUserDirectoryTarget.mockResolvedValue(null);
    const result = await setDirectoryRoleAction({
      userId: "owner-2",
      role: "admin",
    });
    expect(result.ok).toBe(false);
    expectNothingWritten();
  });

  it("refuses an owner changing ANY role on an out-of-scope (staff) target", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    // The directory only manages customers; an admin row is out of scope, so a
    // forged request naming a staff id is refused before any write.
    repoMocks.getUserDirectoryTarget.mockResolvedValue(null);
    for (const role of ["user", "admin", "owner"] as const) {
      const result = await setDirectoryRoleAction({
        userId: "staff-9",
        role,
      });
      expect(result.ok, `out-of-scope target, assigning ${role}`).toBe(false);
    }
    expectNothingWritten();
  });

  /* ---------------------------------------------------------------- */
  /* Validation                                                        */
  /* ---------------------------------------------------------------- */

  it("rejects an invalid role value before writing, for an owner", async () => {
    mockGetSession.mockResolvedValue({ user: OWNER });
    const result = await setDirectoryRoleAction({
      userId: "cust-1",
      role: "superuser" as never,
    });
    expect(result.ok).toBe(false);
    expectNothingWritten();
  });

  it("rejects an empty / over-long id and a non-boolean ban before writing", async () => {
    mockGetSession.mockResolvedValue({ user: ADMIN });

    expect(
      (await setDirectoryBannedAction({ userId: "", banned: true })).ok,
    ).toBe(false);
    expect(
      (
        await setDirectoryBannedAction({
          userId: "x".repeat(5000),
          banned: true,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await setDirectoryBannedAction({
          userId: "cust-1",
          banned: "yes" as never,
        })
      ).ok,
    ).toBe(false);

    expectNothingWritten();
  });
});
