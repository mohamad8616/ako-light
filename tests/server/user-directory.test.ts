/**
 * `/admin/users` repository — the PRIVACY boundary, against the real database.
 *
 * Two things are proven here that a mock cannot prove:
 *
 *   1. the projection is a SAFE SET — a returned row has exactly the expected
 *      keys and nothing else, so a password hash / session token / OAuth token
 *      can never ride along;
 *   2. only CUSTOMER rows are in scope — owner/admin staff accounts are excluded
 *      from the directory (least privilege), while the actions still resolve a
 *      customer target correctly.
 *
 * A `User` row is created WITH an associated `Account` carrying a `password`
 * value (and access/refresh tokens) to model a real credential-bearing account.
 * If the projection ever leaked, those values would have to appear in the row —
 * they do not.
 *
 * Part of the `server` Vitest project.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  buildDirectoryWhere,
  getUserDirectoryPage,
  getUserDirectoryTarget,
} from "@/lib/repositories/user-directory";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const RUN = `dirpriv-${Date.now().toString(36)}`;
const createdUserIds: string[] = [];
const createdAccountIds: string[] = [];

/** The secret material we plant to prove it cannot surface. */
const SECRET_PASSWORD_HASH = `$2b$12$${RUN}-SECRET-HASH`;
const SECRET_ACCESS_TOKEN = `${RUN}-SECRET-ACCESS`;
const SECRET_REFRESH_TOKEN = `${RUN}-SECRET-REFRESH`;

async function makeUser(
  role = "user",
  slug = randomUUID().slice(0, 8),
): Promise<string> {
  const id = `t-${RUN}-${slug}`;
  await prisma.user.create({
    data: {
      id,
      name: `Directory ${slug}`,
      email: `${id}@example.test`,
      role,
    },
  });
  createdUserIds.push(id);
  return id;
}

describeDb("user-directory repository — privacy + scope", () => {
  afterAll(async () => {
    if (createdAccountIds.length) {
      await prisma.account.deleteMany({ where: { id: { in: createdAccountIds } } });
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  it("returns ONLY the safe projection — no credential material", async () => {
    const id = await makeUser("user");
    // Attach a credential-bearing Account, as a real password user would have.
    const accountId = `acc-${RUN}-${randomUUID().slice(0, 8)}`;
    await prisma.account.create({
      data: {
        id: accountId,
        accountId: id,
        providerId: "credential",
        userId: id,
        password: SECRET_PASSWORD_HASH,
        accessToken: SECRET_ACCESS_TOKEN,
        refreshToken: SECRET_REFRESH_TOKEN,
      },
    });
    createdAccountIds.push(accountId);

    const { rows } = await getUserDirectoryPage({ pageSize: 100 });
    const row = rows.find((r) => r.id === id);
    expect(row, "the customer row is present").toBeTruthy();

    // Exactly the allowed keys — nothing more.
    expect(Object.keys(row!).sort()).toEqual(
      [
        "banned",
        "createdAt",
        "email",
        "emailVerified",
        "id",
        "name",
        "phoneNumber",
        "role",
      ].sort(),
    );

    // The serialized row contains none of the secret material.
    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain(SECRET_PASSWORD_HASH);
    expect(serialized).not.toContain(SECRET_ACCESS_TOKEN);
    expect(serialized).not.toContain(SECRET_REFRESH_TOKEN);
    // And no credential-bearing key names from Account/Session.
    for (const forbidden of [
      "password",
      "passwordHash",
      "hashedPassword",
      "accessToken",
      "refreshToken",
      "idToken",
      "token",
      "sessions",
      "accounts",
    ]) {
      expect(Object.keys(row!), `row must not expose "${forbidden}"`).not.toContain(
        forbidden,
      );
    }
  });

  it("excludes owner and admin staff accounts from the directory", async () => {
    const customerId = await makeUser("user", "kept");
    const adminId = await makeUser("admin", "staff-admin");
    const ownerId = await makeUser("owner", "staff-owner");

    const { rows } = await getUserDirectoryPage({ pageSize: 100 });
    const ids = rows.map((r) => r.id);

    expect(ids).toContain(customerId);
    expect(ids).not.toContain(adminId);
    expect(ids).not.toContain(ownerId);
  });

  it("getUserDirectoryTarget returns a customer but not a staff account", async () => {
    const customerId = await makeUser("user", "target-cust");
    const adminId = await makeUser("admin", "target-admin");

    const customer = await getUserDirectoryTarget(customerId);
    expect(customer?.role).toBe("user");

    const staff = await getUserDirectoryTarget(adminId);
    expect(staff).toBeNull();
  });

  it("buildDirectoryWhere restricts to customers and shapes the search", () => {
    expect(buildDirectoryWhere()).toEqual({ role: { in: ["user"] } });

    const searched = buildDirectoryWhere("  ali  ");
    expect(searched.role).toEqual({ in: ["user"] });
    expect(searched.OR).toHaveLength(2);
    // The query is trimmed before it reaches Postgres.
    expect(JSON.stringify(searched)).toContain("ali");
    expect(JSON.stringify(searched)).not.toContain("  ali  ");
  });

  it("paginates server-side and reports a total", async () => {
    const { total, pageSize, page, rows } = await getUserDirectoryPage({
      page: 1,
      pageSize: 5,
    });
    expect(page).toBe(1);
    expect(pageSize).toBe(5);
    expect(rows.length).toBeLessThanOrEqual(5);
    expect(total).toBeGreaterThanOrEqual(rows.length);
  });
});
