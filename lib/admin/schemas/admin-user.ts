import { z } from "zod";
import { idSchema } from "./common";

/**
 * The `/admin/admins` (owner-only) user-management form rules.
 *
 * Scope is deliberately narrow — the schema exposes ONLY the two columns the
 * owner may change on another account:
 *
 *   - `role`   → promote a customer to `admin`, or demote an `admin` back to
 *                `user`. The three canonical values are spelled out here (and
 *                stay 1:1 with `ROLES` in lib/auth/permissions.ts) so a forged
 *                payload cannot invent a role the app does not know.
 *   - `banned` → the existing ban flag better-auth's admin plugin already
 *                enforces at session creation (see lib/auth/auth.ts).
 *
 * Everything else on `User` (email, phone, name, `referredByCode`, …) is NOT
 * writable through this module: no schema field means a forged POST cannot
 * smuggle a value past the action.
 *
 * `owner` is intentionally ABSENT from the assignable set. Only `user` and
 * `admin` are ever assignable through the UI/actions — the owner role is not
 * granted from this screen, and an owner can never target themselves (the
 * action enforces that separately, because a schema cannot see the caller).
 *
 * Kept free of server-only imports (no prisma, no next/headers) so the client
 * table may import the enum + value type directly, exactly like
 * lib/admin/schemas/order.ts.
 */

/** The roles an owner may ASSIGN through this screen (never `owner`). */
export const assignableRoleSchema = z.enum(["user", "admin"]);

export type AssignableRole = z.infer<typeof assignableRoleSchema>;

/**
 * The assignable roles as an ordered array, for the UI's select options.
 * `owner` is deliberately absent — the owner role is not granted here.
 */
export const ASSIGNABLE_ROLES: readonly AssignableRole[] = ["admin", "user"];

/** Every role value the `User.role` column may hold (mirrors `ROLES`). */
export const appRoleSchema = z.enum(["user", "admin", "owner"]);

export type AppRoleValue = z.infer<typeof appRoleSchema>;

/** Promote/demote a user by id. */
export const setUserRoleFormSchema = z.object({
  userId: idSchema,
  role: assignableRoleSchema,
});

export type SetUserRoleFormValues = z.infer<typeof setUserRoleFormSchema>;

/** Ban/unban a user by id. */
export const setUserBannedFormSchema = z.object({
  userId: idSchema,
  banned: z.boolean(),
});

export type SetUserBannedFormValues = z.infer<typeof setUserBannedFormSchema>;
