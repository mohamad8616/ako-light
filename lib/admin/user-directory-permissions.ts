import { ADMIN_ROLES, ROLES, type AppRole } from "@/lib/auth/permissions";

/**
 * Capability model for the SHARED user directory (`/admin/users`).
 *
 * Both `admin` and `owner` see the SAME list, but their powers differ. This
 * module is the single, testable source of truth for "who may do what", so the
 * server actions, the page and the table all agree instead of each re-deriving
 * the rules.
 *
 * ── Role hierarchy (lowest → highest) ────────────────────────────────────────
 *
 *     user  <  admin  <  owner
 *
 *   - `user`  — a customer. Sees no admin surface at all.
 *   - `admin` — an operator: moderates accounts (ban/unban) but has NO
 *               authority to change anyone's role. Ever.
 *   - `owner` — everything an admin can do, PLUS the exclusive authority to
 *               grant roles: promote a customer straight to `admin` OR
 *               straight to `owner`, or promote an existing `admin` to
 *               `owner`. An owner may never modify another owner.
 *
 * ── The one invariant that must never regress ────────────────────────────────
 *
 *   An `admin` can NEVER grant, revoke, or otherwise change ANY role.
 *
 * The functions below return `false` for every admin-actor promotion case, and
 * the server action re-checks the same helpers (defence in depth: UI hiding is
 * convenience, not authorization).
 *
 * Kept free of server-only imports (no prisma, no next/headers, no React) so
 * both the client table and the server actions can import it, exactly like
 * `lib/auth/permissions.ts`.
 */

/** The action an actor is attempting on a target account. */
export type DirectoryAction = "ban" | "unban" | "assign-role";

/** Numeric rank, for a total order over the hierarchy. */
const RANK: Record<AppRole, number> = {
  [ROLES.user]: 0,
  [ROLES.admin]: 1,
  [ROLES.owner]: 2,
};

/** Whether `actor` outranks `target` (strictly higher privilege). */
export function outranks(actor: AppRole, target: AppRole): boolean {
  return RANK[actor] > RANK[target];
}

/** Whether the role is admin-level at all (may enter the directory). */
export function isAdminLevel(role: AppRole | undefined): boolean {
  return role !== undefined && ADMIN_ROLES.includes(role);
}

/* -------------------------------------------------------------------------- */
/* Read access                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Both admin and owner may VIEW the directory; a plain customer may not.
 * The page enforces this with `requireAdminAccess()`; this mirrors it as a
 * pure predicate so the rule is testable without a request.
 */
export function canViewDirectory(actor: AppRole | undefined): boolean {
  return isAdminLevel(actor);
}

/* -------------------------------------------------------------------------- */
/* Moderation (ban / unban)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Moderating a target account.
 *
 * Rule: an admin-level actor may ban/unban an account that is STRICTLY BELOW
 * them. That means:
 *   - admin  → may moderate customers (`user`) only;
 *   - owner  → may moderate customers and admins, but never another owner;
 *   - nobody → may moderate themselves.
 */
export function canModerate(actor: AppRole | undefined, target: AppRole): boolean {
  if (!isAdminLevel(actor)) return false;
  return outranks(actor as AppRole, target);
}

/**
 * `canModerate` with the self-check folded in — the form every server action
 * actually needs, because an actor must never be able to lock themselves out.
 */
export function canModerateAccount(args: {
  actorRole: AppRole | undefined;
  actorId: string;
  targetRole: AppRole;
  targetId: string;
}): boolean {
  if (args.actorId === args.targetId) return false;
  return canModerate(args.actorRole, args.targetRole);
}

/* -------------------------------------------------------------------------- */
/* Role assignment (the exclusive owner authority)                            */
/* -------------------------------------------------------------------------- */

/**
 * The roles an actor may assign to a target, given the target's CURRENT role.
 *
 * This is the authority table in one function. The admin row is deliberately
 * empty: **no role assignment is ever available to an admin**.
 *
 *   actor  | target.user        | target.admin       | target.owner
 *   -------|--------------------|--------------------|-------------------
 *   admin  | (none)             | (none)             | (none)
 *   owner  | admin, owner       | owner              | (none)
 *
 * Notes:
 *   - a `user` (customer) may be promoted straight to `admin` OR straight to
 *     `owner` — promotion is NOT forced to be one level at a time, so an owner
 *     can mint another owner in a single step;
 *   - an `admin` may be promoted to `owner` (and nothing else — there is no
 *     demotion path through this screen; demoting staff is the job of the
 *     owner-only `/admin/admins` screen, not the customer directory);
 *   - an `owner` target is immutable through this screen (the "never modify
 *     another owner" rule, which also protects the last owner);
 *   - the actor's own account is always excluded (see `canAssignRole`).
 */
export function assignableRoles(
  actor: AppRole | undefined,
  target: AppRole,
): readonly AppRole[] {
  if (actor !== ROLES.owner) return [];
  if (target === ROLES.user) return [ROLES.admin, ROLES.owner];
  if (target === ROLES.admin) return [ROLES.owner];
  return [];
}

/**
 * Whether `actor` may set `target`'s role to `next`, from the target's current
 * role. Composes the authority table with the self-protection rule.
 *
 * The `actor !== owner` short-circuit is what makes "an admin has no promotion
 * authority under any circumstance" true by construction — not by a UI flag.
 */
export function canAssignRole(args: {
  actorRole: AppRole | undefined;
  actorId: string;
  targetRole: AppRole;
  targetId: string;
  next: AppRole;
}): boolean {
  if (args.actorId === args.targetId) return false;
  if (args.actorRole !== ROLES.owner) return false;
  return assignableRoles(args.actorRole, args.targetRole).includes(args.next);
}

/**
 * A one-line, UI-facing summary of an actor's powers — used to render the
 * "your scope" note above the directory so the distinction is visible, not
 * implicit.
 */
export type DirectoryScope = "owner" | "admin";

export function directoryScope(actor: AppRole | undefined): DirectoryScope {
  return actor === ROLES.owner ? "owner" : "admin";
}

/**
 * Whether the actor may perform `action` on a target account, as a single
 * entry point the actions can branch on. Kept thin on purpose: it delegates to
 * the specific predicates above so there is exactly one implementation of each
 * rule.
 */
export function canPerformDirectoryAction(args: {
  action: DirectoryAction;
  actorRole: AppRole | undefined;
  actorId: string;
  targetRole: AppRole;
  targetId: string;
}): boolean {
  if (args.action === "assign-role") {
    // Callers must use `canAssignRole` with the concrete `next` value; this
    // coarse form only answers "may this actor change roles at all".
    return args.actorRole === ROLES.owner && args.actorId !== args.targetId;
  }
  return canModerateAccount(args);
}
