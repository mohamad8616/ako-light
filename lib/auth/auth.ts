import {
  APIError,
  createAuthMiddleware,
  getAuthoritativeSessionFromCtx,
} from "better-auth/api";
import {
  adminTargetField,
  actorOutranksTarget,
  checkAdminActor,
} from "@/lib/auth/admin-endpoint-policy";
import {
  ADMIN_ROLES,
  ROLES,
  accessControl,
  rolePermissions,
  type AppRole,
} from "@/lib/auth/permissions";
import { sendOtpSms } from "@/lib/auth/sms";
import { prisma } from "@/lib/db/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, phoneNumber } from "better-auth/plugins";

/**
 * Normalize a base URL env value into something `new URL()` accepts.
 *
 * A bare domain (`ako-light.vercel.app`, with no scheme) throws
 * `ERR_INVALID_URL` at import time and fails the production build during
 * page prerendering. Accept the bare form and assume https (production
 * domains are always https on Vercel).
 */
function normalizeBaseUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim().replace(/\/+$/, "");
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/**
 * Target- and actor-aware guard for better-auth's built-in admin endpoints.
 *
 * Why this is needed at all:
 *
 *   `lib/auth/permissions.ts` already removes `set-role` from the admin role,
 *   so the three better-auth role-WRITE paths (`/admin/set-role`, the `role`
 *   field of `/admin/update-user`, and the `role` field of
 *   `/admin/create-user`) return 403 for an `admin`. What that permission map
 *   cannot express is anything about the TARGET: better-auth's endpoints do
 *   not compare ranks at all. Verified against 1.7.7's
 *   `plugins/admin/routes.mjs`, an `owner` session can therefore still
 *   `POST /admin/ban-user { userId: <another owner> }`, and an owner can
 *   `POST /admin/set-role { userId: <themselves> }` and demote themselves.
 *
 *   The dashboard's own actions already refuse both
 *   (lib/admin/user-directory-permissions.ts: "never modify another owner",
 *   "never act on yourself"), so this hook re-states exactly those two rules
 *   for the raw HTTP surface — the same policy, one layer lower.
 *
 * Rules enforced, in order:
 *   1. Only `owner`/`admin` actors reach the endpoints at all (401/403
 *      otherwise) — the permission map would also reject them, but failing
 *      closed here keeps the rule in one place.
 *   2. An actor may never target their own account (`self`).
 *   3. An actor may only target a STRICTLY LOWER-ranked account (`rank`).
 *
 * The hook is intentionally generic: it is the single place that knows which
 * body field names a target, so a future better-auth endpoint that takes a
 * `userId` is covered by adding its path to `ADMIN_TARGET_FIELD`, not by
 * writing a new guard.
 *
 * The rule table (`ADMIN_TARGET_FIELD`), the actor-level checks and the rank
 * rule all live in lib/auth/admin-endpoint-policy.ts — a PURE module with no
 * server imports, so the policy can be unit-tested without booting Next or
 * reaching the database. `adminTargetField()` is the only piece this middleware
 * needs; the rationale for which endpoints are listed (including why
 * `/admin/set-user-password` must be) is documented there.
 */

const adminTargetGuard = createAuthMiddleware(async (ctx) => {
  const field = adminTargetField(String(ctx.path ?? ""));
  if (!field) return;

  // ── WHY THIS RESOLVES THE SESSION ITSELF ────────────────────────────────
  //
  // A `hooks.before` entry runs BEFORE the endpoint's own middleware: see
  // `dispatchAuthEndpoint` in better-auth's `api/dispatch.mjs`, which awaits
  // `runBeforeHooks` and only THEN calls `endpoint(...)`. The admin plugin's
  // `use: [adminMiddleware]` is part of that endpoint, so `ctx.context.session`
  // is still `null` here.
  //
  // Reading it — as this hook originally did — made every rule below
  // UNREACHABLE: the guard returned early on every request, so the endpoints
  // were never restricted at all. Verified by driving the real handler: an
  // admin could reset an owner's password, list an owner's session tokens and
  // ban an owner, all with 200s.
  //
  // `getAuthoritativeSessionFromCtx` is the same resolver the admin plugin's
  // own middleware uses, exported from the public `better-auth/api` entry. The
  // "authoritative" form skips the cookie cache, so a role changed since the
  // cookie was issued cannot be used to authorise an action.
  //
  // A missing session means the caller never authenticated — left to
  // better-auth's own 401 so the response stays uniform.
  const resolved = await getAuthoritativeSessionFromCtx(ctx);
  if (!resolved) return;

  const actorId = resolved.user.id;
  const actorRole = resolved.user.role as AppRole | undefined;

  const body = (ctx.body ?? {}) as Record<string, unknown>;
  const targetId = body[field];
  if (typeof targetId !== "string" || targetId.length === 0) return;

  // The actor-level rules run BEFORE any database read, so a caller who is
  // going to be refused cannot make the server do work, and cannot probe which
  // user ids exist by comparing error codes.
  const verdict = checkAdminActor({ actorRole, actorId, targetId });
  if (verdict === "not-admin") {
    throw APIError.from("FORBIDDEN", {
      message: "You are not allowed to perform this action.",
      code: "NOT_ALLOWED_TO_PERFORM_ADMIN_ACTION",
    });
  }
  if (verdict === "self") {
    throw APIError.from("FORBIDDEN", {
      message: "You cannot perform this action on your own account.",
      code: "CANNOT_TARGET_SELF",
    });
  }

  const target = await ctx.context.internalAdapter.findUserById(targetId);
  if (!target) return; // let the endpoint answer with its own 404

  // The rank rule — strictly lower only. This is what stops an `admin` from
  // banning or password-resetting an `owner`, and what stops an `owner` from
  // modifying another owner.
  // `findUserById` is typed without the plugin's extra `role` field, so the
  // cast is the same one the session read above uses.
  if (
    !actorOutranksTarget(
      actorRole,
      (target as { role?: string }).role,
    )
  ) {
    throw APIError.from("FORBIDDEN", {
      message: "You cannot perform this action on that account.",
      code: "CANNOT_TARGET_EQUAL_OR_HIGHER_ROLE",
    });
  }
});

export const auth = betterAuth({
  // Prefer the server-side BETTER_AUTH_URL; fall back to the public app URL
  // so a missing BETTER_AUTH_URL alone can never crash with Invalid URL.
  baseURL: normalizeBaseUrl(
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  ),
  // ── Why `hooks` also lives on the PLUGIN below ────────────────────────────
  //
  // better-auth runs a top-level `hooks.before` on the SHARED context only.
  // With a static `baseURL` (our case) the HTTP handler builds a per-request
  // context with
  //
  //     Object.create(ctx, Object.getOwnPropertyDescriptors(ctx))
  //
  // and `ctx.hooks` is NOT an own property of the root context — it is added
  // per request by the router's `defu(options, …)` pass. So the clone starts
  // with `hooks === undefined`, `defu` therefore writes the framework's
  // defaults into it, and the user's middleware is silently shadowed for every
  // request AFTER the first (which is why `adminTargetGuard` below is *also*
  // registered as a plugin hook — plugin hooks are collected from
  // `options.plugins` on every request, so they survive the clone).
  //
  // This top-level entry is kept because it is the documented location and
  // costs nothing; the plugin registration is the one that actually runs.
  hooks: {
    before: adminTargetGuard,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "sqlite", ...etc
  }),
  user: {
    // Lets phoneNumber.verify() forward `referredByCode` (and any future
    // extra body field) into createUser on the sign-up path — the verify
    // endpoint runs parseUserInput(rest, "create"), which only keeps fields
    // declared here. Must have a matching column (see User.referredByCode
    // in prisma/schema.prisma).
    additionalFields: {
      referredByCode: {
        type: "string",
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    phoneNumber({
      // Defaults pinned explicitly so the OTP contract is visible to the
      // login UI step: 6 digits, 5 minutes, 3 verification attempts.
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      // Unified sign-in/sign-up: a single phoneNumber.verify() call creates
      // a new account for an unrecognized number or logs in an existing one.
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@phone.ako-light.local`,
        getTempName: (phoneNumber) => phoneNumber,
      },
      // Every OTP delivery goes through the mock sender in lib/auth/sms.ts —
      // a real SMS provider is swapped in there, not here.
      sendOTP: async ({ phoneNumber: to, code }) => {
        await sendOtpSms(to, code);
      },
    }),
    admin({
      defaultRole: ROLES.user,
      // Both roles are admin-level actors, but their permissions differ (see
      // lib/auth/permissions.ts): only `owner` may impersonate other admins.
      adminRoles: [...ADMIN_ROLES],
      ac: accessControl,
      roles: rolePermissions,
    }),
    {
      // Registration shim that exists ONLY to carry `adminTargetGuard` as a
      // PLUGIN hook. Plugin `hooks.before` entries are rebuilt from
      // `options.plugins` on every request (see
      // better-auth#api/dispatch.mjs `getHooks`), so they survive the
      // per-request context clone that drops top-level `hooks` — see the note
      // on the `hooks` option above. No endpoints, schema or other behaviour.
      id: "admin-endpoint-guard",
      hooks: {
        before: [{ matcher: () => true, handler: adminTargetGuard }],
      },
    },
    nextCookies(), // make sure this is the last plugin in the array
  ],
});
