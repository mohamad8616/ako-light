import { ADMIN_ROLES, ROLES, type AppRole } from "@/lib/auth/permissions";

/**
 * The target- and actor-aware policy for better-auth's built-in admin endpoints.
 *
 * WHY THIS MODULE EXISTS, AND WHY IT IS PURE
 *
 * `lib/auth/permissions.ts` removes `set-role` from the admin role, so the three
 * better-auth role-WRITE paths (`/admin/set-role`, and the `role` field of
 * `/admin/update-user` and `/admin/create-user`) already return 403 for an
 * `admin`. What a permission map cannot express is anything about the TARGET:
 * better-auth's endpoints never compare ranks. Verified against 1.7.7's
 * `plugins/admin/routes.mjs`, an `owner` session can still
 * `POST /admin/ban-user { userId: <another owner> }`, and an owner can
 * `POST /admin/set-role { userId: <themselves> }` and demote themselves.
 *
 * The rules below are the missing half. They live here, with NO server imports
 * (no prisma, no better-auth, no next/headers), for two reasons:
 *
 *   1. `lib/auth/auth.ts` can call them from its request middleware; and
 *   2. they can be unit-tested hermetically. That matters: the `auth` tier
 *      drives a real Next server and is subject to the remote pooler's flakiness,
 *      so a rule table that only the integration suite could check would be
 *      effectively unverified on a bad day.
 *
 * ── The endpoints that take a target ────────────────────────────────────────
 *
 * `/admin/set-user-password` is the reason this map must be exhaustive rather
 * than "the obvious ones". 1.7.7's `adminAc` grants `set-password`, and the
 * admin role is derived from `adminAc` minus ONLY `set-role` — so an `admin`
 * HOLDS `user: ["set-password"]`. Without a rank check an admin could set an
 * OWNER's password and then sign in as that owner, bypassing the hierarchy
 * entirely. The rank rule below closes it while still letting an admin reset a
 * CUSTOMER's password (permitted moderation).
 *
 * `/admin/list-user-sessions` takes a `userId` and returns that user's session
 * TOKENS — exactly the input `/admin/revoke-user-session` needs, and that
 * endpoint takes a `sessionToken`, not a `userId`, so it cannot be rank-checked.
 * Blocking the discovery step is what closes that chain.
 */

/** Numeric rank, for a total order over the hierarchy (lowest → highest). */
export const ROLE_RANK: Record<AppRole, number> = {
  [ROLES.user]: 0,
  [ROLES.admin]: 1,
  [ROLES.owner]: 2,
};

/**
 * Endpoint path (plugin-relative) → the body field that names the target.
 *
 * `ctx.path` is the route path WITHOUT the mounting base path (verified against
 * 1.7.7: an HTTP call to `/api/auth/ok` arrives as `/ok`), so the keys are the
 * plugin's own paths.
 */
export const ADMIN_TARGET_FIELD: Readonly<Record<string, string>> = {
  "/admin/set-role": "userId",
  "/admin/update-user": "userId",
  "/admin/ban-user": "userId",
  "/admin/unban-user": "userId",
  "/admin/remove-user": "userId",
  "/admin/revoke-user-sessions": "userId",
  "/admin/list-user-sessions": "userId",
  "/admin/set-user-password": "userId",
  "/admin/impersonate-user": "userId",
};

/**
 * The body field naming the target for `path`, or `null` when the endpoint is
 * not one this policy guards (a read, an endpoint with no target, or a route
 * whose target is not a `userId` at all).
 *
 * The stripped lookup is defensive only — see the note on `ctx.path` above.
 */
export function adminTargetField(path: string): string | null {
  return (
    ADMIN_TARGET_FIELD[path] ??
    ADMIN_TARGET_FIELD[path.replace(/^\/api\/auth/, "")] ??
    null
  );
}

/** Why an actor was refused, or `"ok"` when the actor-level rules pass. */
export type AdminActorVerdict = "not-admin" | "self" | "ok";

/**
 * The rules that need no target lookup, evaluated in this order.
 *
 *   1. only an admin-level actor may act through these endpoints at all;
 *   2. nobody may target their own account.
 *
 * Kept separate from the rank rule so `lib/auth/auth.ts` can refuse BEFORE
 * reading the target from the database — an unauthorised caller must not be
 * able to make the server do work, and must not be able to probe which user ids
 * exist by comparing error codes.
 */
export function checkAdminActor(args: {
  actorRole: AppRole | undefined;
  actorId: string;
  targetId: string;
}): AdminActorVerdict {
  if (!args.actorRole || !ADMIN_ROLES.includes(args.actorRole)) {
    return "not-admin";
  }
  if (args.targetId === args.actorId) return "self";
  return "ok";
}

/**
 * Whether `actorRole` may act on an account whose current role is
 * `targetRole` — the STRICTLY-LOWER rule.
 *
 * This is what stops an `admin` from banning or password-resetting an `owner`,
 * and what stops an `owner` from modifying another owner.
 *
 * An unknown or blank stored role ranks lowest (`-1`), so a row with a
 * hand-edited role can never out-rank the actor — the failure mode is "too
 * permissive to be exploitable", never "silently grants authority".
 */
export function actorOutranksTarget(
  actorRole: AppRole | undefined,
  targetRole: string | undefined,
): boolean {
  const actorRank = actorRole === undefined ? -1 : (ROLE_RANK[actorRole] ?? -1);
  const targetRank = targetRole === undefined ? -1 : (ROLE_RANK[targetRole as AppRole] ?? -1);
  return actorRank > targetRank;
}
