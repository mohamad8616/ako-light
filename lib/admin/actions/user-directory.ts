"use server";

/**
 * Server actions for the SHARED user directory (`/admin/users`).
 *
 * Both `admin` and `owner` reach these actions, but each one re-derives the
 * caller's authority from the database on every call. The UI hiding a button is
 * convenience; THESE gates are the security boundary.
 *
 * ── Authorization, in order ──────────────────────────────────────────────────
 *
 *   1. `requireAdminAccess()` — anonymous and plain `user` are bounced before
 *      anything else runs. (The edge gate in proxy.ts already did this; this is
 *      the React-tree backstop.)
 *   2. The TARGET is re-read from the database. Its role is never taken from
 *      the request body — a client cannot claim "this account is only a user".
 *   3. `canModerateAccount` / `canAssignRole` decide. Both encode:
 *        - an admin may NEVER change any role;
 *        - an actor may never act on themselves;
 *        - an actor may only act on a strictly-lower-ranked account.
 *
 * Note on ownership: only an OWNER reaches a role write. An admin hitting
 * `setDirectoryRoleAction` is refused by `canAssignRole` BEFORE the role read,
 * so no write and no information leak occurs.
 */
import { getAdminIdentity, requireAdminAccess } from "@/lib/admin/access";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import {
  directoryBanFormSchema,
  directoryRoleFormSchema,
  type DirectoryBanFormValues,
  type DirectoryRoleFormValues,
} from "@/lib/admin/schemas/user-directory";
import {
  canAssignRole,
  canModerateAccount,
} from "@/lib/admin/user-directory-permissions";
import { ROLES, type AppRole } from "@/lib/auth/permissions";
import {
  getUserDirectoryTarget,
  type UserDirectoryRow,
} from "@/lib/repositories/user-directory";
import { setUserBanned, setUserRole } from "@/lib/repositories/admin-users";

/** A refusal that carries no information about the target. */
function forbidden(): ActionResult<never> {
  return actionFail("invalid");
}

/**
 * Re-reads the caller's identity WITH their role. `getAdminIdentity` returns
 * null for a plain `user` (same filter as `getAdminRole`), so a null here means
 * "not admin-level" and the action refuses.
 */
async function requireAdminIdentity(): Promise<{
  id: string;
  role: AppRole;
}> {
  const identity = await getAdminIdentity();
  if (!identity) {
    // Unreachable in practice — `requireAdminAccess()` ran first — but kept so
    // the helpers below can rely on a non-null actor.
    throw new Error("admin identity missing after access check");
  }
  return identity;
}

/**
 * Reads the target and confirms it is a customer row the directory manages.
 *
 * Returns the row on success, or a refusal ActionResult to return verbatim. The
 * target's role comes from the DB, never the request.
 */
async function loadTarget(
  userId: string,
): Promise<
  | { ok: true; target: UserDirectoryRow }
  | { ok: false; result: ActionResult<never> }
> {
  const target = await getUserDirectoryTarget(userId);
  if (!target) return { ok: false, result: actionFail("notFound") };
  return { ok: true, target };
}

/**
 * Ban or unban a customer.
 *
 * Allowed for: `admin` and `owner`, on a strictly-lower-ranked customer.
 * Never allowed on: another admin-level account, or the caller themselves.
 */
export async function setDirectoryBannedAction(
  input: DirectoryBanFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = directoryBanFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  const actor = await requireAdminIdentity();
  const loaded = await loadTarget(parsed.data.userId);
  if (!loaded.ok) return loaded.result;

  if (
    !canModerateAccount({
      actorRole: actor.role,
      actorId: actor.id,
      targetRole: loaded.target.role,
      targetId: loaded.target.id,
    })
  ) {
    return forbidden();
  }

  try {
    await setUserBanned(parsed.data.userId, parsed.data.banned);
    revalidateCatalog("admins", { id: parsed.data.userId });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

/**
 * Change a customer's role.
 *
 * OWNER-ONLY. An `admin` is refused here unconditionally — this is the single
 * most important rule in the pass, and it is enforced by the owner short-circuit
 * plus `canAssignRole` (which returns false for any non-owner actor) rather than
 * by a UI flag.
 *
 * The exact legal moves, once the actor is confirmed to be an owner:
 *   - user  → admin
 *   - user  → owner   (a customer may be promoted straight to owner)
 *   - admin → owner
 * Anything else (including touching another owner, or targeting self) is
 * refused. There is deliberately NO demotion path here: demoting staff is the
 * owner-only `/admin/admins` screen's job, not the customer directory's.
 */
export async function setDirectoryRoleAction(
  input: DirectoryRoleFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = directoryRoleFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  const actor = await requireAdminIdentity();

  // Admin (or any non-owner) is stopped here — before the target is even read.
  if (actor.role !== ROLES.owner) {
    return forbidden();
  }

  const loaded = await loadTarget(parsed.data.userId);
  if (!loaded.ok) return loaded.result;

  if (
    !canAssignRole({
      actorRole: actor.role,
      actorId: actor.id,
      targetRole: loaded.target.role,
      targetId: loaded.target.id,
      next: parsed.data.role,
    })
  ) {
    return forbidden();
  }

  try {
    const updated = await setUserRole(
      parsed.data.userId,
      loaded.target.role,
      parsed.data.role,
    );
    if (!updated) return actionFail("invalid");
    revalidateCatalog("admins", { id: parsed.data.userId });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
