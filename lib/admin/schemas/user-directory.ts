import { z } from "zod";
import { idSchema } from "./common";

/**
 * Form rules for the SHARED user directory (`/admin/users`).
 *
 * Scope is deliberately narrow. Two — and only two — columns may be touched on
 * a customer account:
 *
 *   - `banned` → the moderation action (ban / unban), available to BOTH admin
 *                and owner (subject to the target being strictly below them).
 *   - `role`   → an owner-only promotion. The action enforces the authority
 *                table in lib/admin/user-directory-permissions.ts; the schema
 *                merely accepts the value so the action can validate it.
 *
 * No other `User` column is writable through this module: there is no field for
 * it, so a forged POST cannot smuggle one past the action.
 *
 * Kept free of server-only imports so the client table can import the types.
 */

/** Ban / unban a customer by id. */
export const directoryBanFormSchema = z.object({
  userId: idSchema,
  banned: z.boolean(),
});

export type DirectoryBanFormValues = z.infer<typeof directoryBanFormSchema>;

/**
 * Set a customer's role by id.
 *
 * `role` accepts every known role here; the ACTION decides which transitions
 * are legal for the caller (an admin may not assign anything at all — that
 * `false` comes from `canAssignRole`, not from this enum).
 */
export const directoryRoleFormSchema = z.object({
  userId: idSchema,
  role: z.enum(["user", "admin", "owner"]),
});

export type DirectoryRoleFormValues = z.infer<typeof directoryRoleFormSchema>;
