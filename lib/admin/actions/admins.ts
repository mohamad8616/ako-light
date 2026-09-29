"use server";

/**
 * Server actions for the owner-only `/admin/admins` section.
 *
 * Same contract as every other admin action module (re-authorize, re-validate
 * with the form's zod schema, persist through the repository, map failures into
 * `ActionResult`) — with one important difference: the gate is
 * `requireOwnerAccess()`, not `requireAdminAccess()`.
 *
 * Why the owner gate is load-bearing and cannot be left to better-auth alone:
 *   - better-auth's admin plugin authorizes its own `/admin/set-role` endpoint
 *     on `adminRoles` membership, and an `admin` IS admin-level — so the plugin
 *     would let an admin change other users' roles. The project requires
 *     OWNER-only role changes, so the action runs the owner gate first and only
 *     then writes through the repository.
 *   - The UI hides this section from non-owners, but hiding a button is not
 *     authorization: a direct POST to the action still hits the same gate.
 *
 * Self-demotion is prevented HERE, not in the schema: a schema cannot see who
 * the caller is. An owner who targets their own id is rejected before any write
 * (see `OWNER_SELF_*` reasons), so the last owner can never accidentally
 * downgrade or lock themselves out.
 */
import { getAdminIdentity, requireOwnerAccess } from "@/lib/admin/access";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import {
  setUserBannedFormSchema,
  setUserRoleFormSchema,
  type SetUserBannedFormValues,
  type SetUserRoleFormValues,
} from "@/lib/admin/schemas/admin-user";
import {
  getUserRole,
  setUserBanned,
  setUserRole,
} from "@/lib/repositories/admin-users";

/**
 * The caller may not change their OWN role or ban state.
 *
 * Kept as a field-level issue so the table can surface it on the row it came
 * from; the message is a dictionary key like every other admin error.
 */
function selfTargetFailure(): ActionResult<never> {
  return actionFail("selfTarget", [{ field: "userId", code: "selfTarget" }]);
}

/**
 * Allows user -> admin, admin -> user, and admin -> owner transitions.
 *
 * Owner-only. The caller may never target themselves: an owner demoting their
 * own account would strip the only role that can manage roles at all.
 */
export async function setUserRoleAction(
  input: SetUserRoleFormValues,
): Promise<ActionResult<undefined>> {
  await requireOwnerAccess();

  const parsed = setUserRoleFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  // Self-protection: an owner may never change their own role through this
  // screen, regardless of what the UI offered.
  const caller = await getAdminIdentity();
  if (!caller || caller.id === parsed.data.userId) {
    return caller ? selfTargetFailure() : actionFail("invalid");
  }

  try {
    const target = await getUserRole(parsed.data.userId);
    if (!target) return actionFail("notFound");

    const allowedTransition =
      (target.role === "user" && parsed.data.role === "admin") ||
      (target.role === "admin" &&
        (parsed.data.role === "user" || parsed.data.role === "owner"));
    if (!allowedTransition) return actionFail("invalid");

    const updated = await setUserRole(
      parsed.data.userId,
      target.role,
      parsed.data.role,
    );
    if (!updated) return actionFail("invalid");
    revalidateCatalog("admins", { id: parsed.data.userId });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

/**
 * Bans or unbans a user.
 *
 * Owner-only, and self-targeting is refused for the same reason as role
 * changes: an owner must not be able to ban their own account out of the panel.
 * Banning is enforced by better-auth at session creation, so a banned account
 * simply cannot sign in again (see the "banned users" auth tests).
 */
export async function setUserBannedAction(
  input: SetUserBannedFormValues,
): Promise<ActionResult<undefined>> {
  await requireOwnerAccess();

  const parsed = setUserBannedFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  const caller = await getAdminIdentity();
  if (!caller || caller.id === parsed.data.userId) {
    return caller ? selfTargetFailure() : actionFail("invalid");
  }

  try {
    await setUserBanned(parsed.data.userId, parsed.data.banned);
    revalidateCatalog("admins", { id: parsed.data.userId });
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
