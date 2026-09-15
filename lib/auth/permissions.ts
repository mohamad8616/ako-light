import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Access-control definitions for better-auth's admin plugin.
 *
 * `User.role` (prisma/schema.prisma) stores exactly one of these values, and
 * the admin plugin reads this module for both server-side permission checks
 * and — once the admin dashboard lands — client-side
 * `authClient.admin.checkRolePermission` calls. Keep it free of server-only
 * imports (no prisma, no next/headers) so the dashboard can import it.
 *
 * Owner vs admin: this is currently the only difference between the two
 * roles, and it is deliberately inherited from better-auth's own statement
 * set rather than invented here:
 *   - `admin` → everything in better-auth's default admin statements.
 *   - `owner` → the admin statements **plus** `impersonate-admins`, i.e. only
 *               an owner may impersonate another admin. Because
 *               `ADMIN_ROLES` marks both roles as admin-level, an `admin`
 *               cannot impersonate an `owner` either.
 *
 * The exact owner-vs-admin permission matrix for the dashboard is still to be
 * decided; this pass only locks in "owner outranks admin" and the three role
 * names. Widen the arrays below when the dashboard step defines the matrix.
 */

/** Canonical role names, lowest → highest privilege. */
export const ROLES = {
  user: "user",
  admin: "admin",
  owner: "owner",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

/** Every role the admin plugin knows about, lowest → highest privilege. */
export const ALL_ROLES: readonly AppRole[] = [
  ROLES.user,
  ROLES.admin,
  ROLES.owner,
];

/**
 * Roles the admin plugin treats as "admin-level" (its `adminRoles` option).
 * `owner` is included so it can use the `/admin/*` endpoints at all; its extra
 * privileges come from the permissions below, not from being in this list.
 */
export const ADMIN_ROLES: readonly AppRole[] = [ROLES.admin, ROLES.owner];

const ac = createAccessControl(defaultStatements);

/** Regular signed-in customer: no admin-plugin permissions at all. */
export const userRole = ac.newRole({
  user: [],
  session: [],
});

/** Staff-level admin: better-auth's default admin statements. */
export const adminRole = ac.newRole({
  user: [...adminAc.statements.user],
  session: [...adminAc.statements.session],
});

/** Highest-privilege role: admin statements + impersonating other admins. */
export const ownerRole = ac.newRole({
  user: [...adminAc.statements.user, "impersonate-admins"],
  session: [...adminAc.statements.session],
});

/**
 * Role map handed to `admin({ ac, roles })` on the server and to
 * `adminClient({ ac, roles })` once the dashboard uses client-side
 * permission checks.
 */
export const rolePermissions = {
  [ROLES.user]: userRole,
  [ROLES.admin]: adminRole,
  [ROLES.owner]: ownerRole,
};

/** The access control instance paired with `rolePermissions`. */
export const accessControl = ac;