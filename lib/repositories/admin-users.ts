/**
 * Owner-only user-management reads/writes for the `/admin/admins` screen.
 *
 * Mirrors the shape of the other admin repositories (see
 * lib/repositories/orders.ts): a `cache()`d read that returns a plain,
 * serializable DTO, plus the write functions the server actions call. No
 * authorization lives here — every caller is a server action that has already
 * run `requireOwnerAccess()` (lib/admin/access.ts). Keeping the guard in the
 * action keeps this module a pure data-access layer, exactly like the catalog
 * repositories.
 *
 * Deliberately written through Prisma rather than `auth.api.setRole()`:
 * better-auth's own admin endpoint authorizes on `adminRoles` membership, and
 * an `admin` IS admin-level — so the plugin would happily let an admin change
 * roles. The project requires OWNER-only role changes, which the action
 * enforces with `requireOwnerAccess()`; the repository then performs the plain
 * column write.
 */
import { prisma } from "@/lib/db/prisma";
import { ROLES, type AppRole } from "@/lib/auth/permissions";
import { cache } from "react";

/**
 * One row of the management table — a plain, serializable DTO.
 *
 * `role` is narrowed to `AppRole` so the UI can render a type-safe select; the
 * column is a plain string in Postgres (see prisma/schema.prisma), and a value
 * the app does not recognise is normalised to `user` on the way out so an
 * out-of-band row can never render an unknown role.
 */
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  phoneNumber: string | null;
  banned: boolean;
  banReason: string | null;
  emailVerified: boolean;
  /** ISO timestamp — Dates never cross the RSC boundary. */
  createdAt: string;
}

/** The three roles a stored value may be normalised to. */
const KNOWN_ROLES: readonly AppRole[] = [ROLES.user, ROLES.admin, ROLES.owner];

function normalizeRole(value: string): AppRole {
  return KNOWN_ROLES.includes(value as AppRole)
    ? (value as AppRole)
    : ROLES.user;
}

/**
 * Every account, newest first — the `/admin/admins` list.
 *
 * `cache()`d like the other repositories so the layout's session read and the
 * page's row read collapse to one query inside a request.
 */
export const getAdminUserRows = cache(async (): Promise<AdminUserRow[]> => {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phoneNumber: true,
      banned: true,
      banReason: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role),
    phoneNumber: row.phoneNumber,
    banned: row.banned,
    banReason: row.banReason,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
  }));
});

/**
 * Sets a user's role. The caller (a server action) has already verified the
 * request is owner-authorized AND that the target is not the caller.
 *
 * `targetRole` is limited to `user`/`admin` by the schema; this function only
 * ever writes what it is handed, so the owner role can never be granted here.
 */
export async function setUserRole(
  userId: string,
  targetRole: "user" | "admin",
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { role: targetRole },
  });
}

/**
 * Bans or unbans a user, clearing the ban metadata when lifting the ban so a
 * stale reason never lingers on an active account.
 */
export async function setUserBanned(
  userId: string,
  banned: boolean,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: banned
      ? { banned: true }
      : { banned: false, banReason: null, banExpires: null },
  });
}
