/**
 * Pass 12.5A — repository tier: owner-only user management writes.
 *
 * The hermetic unit tests (tests/unit/admin/actions/admins-management.test.ts)
 * already prove the authorization gate and the safety rules. This file proves
 * the layer beneath them actually persists what the action hands it, against
 * the real database:
 *
 *   - `setUserRole` writes the `role` column (promote user→admin, demote
 *     admin→user);
 *   - `setUserBanned` flips `banned` and, when lifting a ban, clears
 *     `banReason`/`banExpires`;
 *   - `getAdminUserRows` returns the plain, serializable DTO and normalizes an
 *     unknown stored role to `user`.
 *
 * Unlike the catalog CRUD tests — whose repository functions accept an optional
 * transaction client — these retain `prisma` directly (matching
 * lib/repositories/orders.ts), because the actions call them without a
 * transaction. So this file creates a throwaway user row, asserts against it,
 * and deletes it in `afterAll` regardless of outcome. Rows are tagged with a
 * unique run marker so a failed test can never leave a stray account behind
 * unnoticed.
 *
 * Part of the `server` Vitest project (vitest.config.ts).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  getAdminUserRows,
  setUserBanned,
  setUserRole,
} from "@/lib/repositories/admin-users";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const RUN = `admintest-${Date.now().toString(36)}`;
const createdIds: string[] = [];

/** Creates a disposable user row and records it for cleanup. */
async function makeUser(role: string = "user"): Promise<string> {
  const id = `t-${RUN}-${randomUUID()}`;
  await prisma.user.create({
    data: {
      id,
      name: "Admin Test User",
      email: `${id}@example.test`,
      role,
    },
  });
  createdIds.push(id);
  return id;
}

describeDb("admin-users repository", () => {
  afterAll(async () => {
    if (createdIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.$disconnect();
  });

  it("setUserRole promotes a user to admin", async () => {
    const id = await makeUser("user");
    await setUserRole(id, "admin");

    const row = await prisma.user.findUnique({ where: { id } });
    expect(row?.role).toBe("admin");
  });

  it("setUserRole demotes an admin back to user", async () => {
    const id = await makeUser("admin");
    await setUserRole(id, "user");

    const row = await prisma.user.findUnique({ where: { id } });
    expect(row?.role).toBe("user");
  });

  it("setUserBanned sets the ban flag and clearing it wipes the ban metadata", async () => {
    const id = await makeUser("user");

    await setUserBanned(id, true);
    let row = await prisma.user.findUnique({ where: { id } });
    expect(row?.banned).toBe(true);

    // Seed a reason first so the clear-on-unban behaviour is observable.
    await prisma.user.update({
      where: { id },
      data: { banReason: "spam", banExpires: new Date(Date.now() + 86_400_000) },
    });

    await setUserBanned(id, false);
    row = await prisma.user.findUnique({ where: { id } });
    expect(row?.banned).toBe(false);
    expect(row?.banReason).toBeNull();
    expect(row?.banExpires).toBeNull();
  });

  it("getAdminUserRows returns a serializable DTO and normalizes an unknown role", async () => {
    const knownId = await makeUser("admin");
    // A role value the app does not recognise must degrade to `user`, never
    // surface as an unknown value in the UI.
    const oddId = await makeUser("superuser");

    const rows = await getAdminUserRows();
    const known = rows.find((r) => r.id === knownId);
    const odd = rows.find((r) => r.id === oddId);

    expect(known?.role).toBe("admin");
    expect(known?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(odd?.role).toBe("user");
    // The DTO is plain JSON — nothing Date/Decimal-bearing crosses the RSC
    // boundary.
    expect(() => JSON.stringify(rows)).not.toThrow();
  });
});
