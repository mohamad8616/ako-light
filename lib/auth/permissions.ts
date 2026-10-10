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
 * ── Owner vs admin ──────────────────────────────────────────────────────────
 *
 * The two roles are admin-level (both are in `ADMIN_ROLES`, so both may enter
 * the dashboard and read the directory), but the OWNER holds two capabilities
 * the admin does not:
 *
 *   1. `user: ["set-role"]` — only an owner may change ANY role.
 *   2. `user: ["impersonate-admins"]` — only an owner may impersonate an
 *      admin-level account. Because `ADMIN_ROLES` marks both roles as
 *      admin-level, an `admin` cannot impersonate an `owner` either.
 *
 * ── Why the admin statements are NOT taken from `adminAc` ───────────────────
 *
 * better-auth's `adminAc` (its default "admin" role) grants `set-role`,
 * `delete`, `set-password` and `set-email`. Those are exactly the statements
 * its built-in endpoints authorize on — `POST /admin/set-role` and the `role`
 * field of `POST /admin/update-user` and `POST /admin/create-user` all require
 * `{ user: ["set-role"] }`, and `/admin/remove-user` requires
 * `{ user: ["delete"] }`.
 *
 * If the admin role kept those statements, an `admin` session could POST
 * straight to `/api/auth/admin/set-role` and promote itself (or anyone else) to
 * `owner` — bypassing the whole dashboard policy, since hiding a button is not
 * authorization. The role map below is therefore the ENFORCEMENT POINT for the
 * endpoint boundary: dropping `set-role` here makes every better-auth role-write
 * endpoint return 403 for an admin, on the server, with no hook or middleware.
 *
 * Verified against better-auth 1.7.7 (`plugins/admin/routes.mjs`):
 *
 *   endpoint                        permission required
 *   ------------------------------  ---------------------------------
 *   /admin/set-role                 user: ["set-role"]
 *   /admin/update-user (role)       user: ["set-role"]
 *   /admin/create-user (role)       user: ["set-role"]
 *   /admin/remove-user              user: ["delete"]
 *   /admin/set-user-password        user: ["set-password"]
 *   /admin/update-user (email)      user: ["set-email"]
 *   /admin/update-user (ban fields) user: ["ban"]
 *   /admin/ban-user, /unban-user    user: ["ban"]
 *   /admin/list-users               user: ["list"]
 *   /admin/get-user                 user: ["get"]
 *   /admin/impersonate-user         user: ["impersonate"]
 *   /admin/revoke-user-sessions     session: ["revoke"]
 *   /admin/list-user-sessions       session: ["list"]
 *
 * One caveat worth knowing before the dashboard grows: better-auth does NOT
 * compare the target's rank on these endpoints (it only blocks banning or
 * deleting *yourself*). "An admin may moderate customers but never another
 * admin/owner" and "an admin may not change its own role" are therefore
 * enforced by the dashboard's own server actions
 * (lib/admin/user-directory-permissions.ts), which re-read the target from the
 * database. What this module guarantees is that an admin can never even reach
 * a role write.
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

/**
 * Every admin-plugin statement EXCEPT the role-write capability.
 *
 * Derived from `adminAc.statements.user` (better-auth's own list) so a plugin
 * upgrade that adds a statement is picked up automatically, then filtered down
 * to the statements the project's admin role is allowed to hold.
 */
const ADMIN_USER_STATEMENTS = adminAc.statements.user.filter(
  (statement) => statement !== "set-role",
);

/**
 * Staff-level admin: moderate accounts, read the directory — never change a
 * role.
 */
export const adminRole = ac.newRole({
  user: [...ADMIN_USER_STATEMENTS],
  session: [...adminAc.statements.session],
});

/**
 * Highest-privilege role: the full admin statement set (including the
 * role-write capability an admin is denied) plus impersonating other admins.
 */
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