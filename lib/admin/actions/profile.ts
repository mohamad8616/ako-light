"use server";

import { getAdminIdentity } from "@/lib/admin/access";
import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/result";
import {
  validateChangePassword,
  type ChangePasswordInput,
} from "@/lib/admin/schemas/profile";
import { auth } from "@/lib/auth/auth";
import { cookieNameRegex, parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies, headers } from "next/headers";

/**
 * Change the signed-in STAFF account's own password (Pass C.2).
 *
 * ── Authorization ───────────────────────────────────────────────────────────
 *
 * `getAdminIdentity()` resolves the session and returns the account only for an
 * `admin`/`owner` — a plain customer or an anonymous caller resolves to null and
 * is refused here, independently of the page gate. That is deliberate: the page
 * also calls `requireAdminAccess(locale)`, but a Server Action is a public
 * endpoint and must not trust that the form was ever rendered.
 *
 * ── There is NO target parameter ────────────────────────────────────────────
 *
 * The action takes passwords and nothing else. The account is ALWAYS the one the
 * session belongs to, so there is no id to tamper with and no way to reach
 * another account's credential. That is a structural guarantee, not a check that
 * could be forgotten.
 *
 * ── Why the better-auth call is safe to make here ───────────────────────────
 *
 * `POST /change-password` (verified in the installed 1.7.7
 * `dist/api/routes/update-user.mjs:76`) is guarded by
 * `sensitiveSessionMiddleware`, takes `{ newPassword, currentPassword,
 * revokeOtherSessions }`, and throws `INVALID_PASSWORD` when the current
 * password does not authenticate. Nothing here hashes or writes a credential —
 * better-auth owns that, and inventing a hash would produce a row that cannot
 * sign in.
 *
 * `revokeOtherSessions: true` signs the account out everywhere EXCEPT this
 * browser, which is the right default for a staff account whose password may
 * have leaked. The endpoint answers with a replacement token for the current
 * session; `nextCookies()` (last plugin in lib/auth/auth.ts) writes it through
 * `cookies()` during the action phase, so the caller stays signed in. If that
 * write ever failed, better-auth's own response would be the authority — the
 * action never touches cookies itself.
 *
 * Passwords are never logged, returned, or included in an error.
 */
export async function changeOwnPasswordAction(
  input: ChangePasswordInput,
): Promise<ActionResult<undefined>> {
  // 1. Authentication + role. No redirect: an action reports, it does not
  //    navigate, and the caller already had to pass the page gate.
  const identity = await getAdminIdentity();
  if (!identity) return actionFail("unknown");

  // 2. Policy — the SAME pure function the form uses, so the 12-character
  //    floor, the confirmation field and the same-as-current rule cannot be
  //    skipped by posting straight to this action.
  const issues = validateChangePassword(input);
  if (issues.length > 0) return actionFail("invalid", issues);

  // 3. better-auth performs the change with the caller's own cookies.
  //
  // `asResponse: true` is LOAD-BEARING, not a style choice.
  //
  // `revokeOtherSessions: true` makes better-auth DELETE every session for the
  // account — including the caller's own — and mint a replacement
  // (`update-user.mjs:174-176`). The replacement only reaches the browser if the
  // Set-Cookie is applied, and `nextCookies()`'s `after` hook applies it from
  // `ctx.context.responseHeaders`. Called without `asResponse`, that header is
  // not produced, the hook returns early, and the caller is silently signed out
  // by their own password change. Verified by
  // tests/server/profile-action.test.ts, which asserts the cookie is written —
  // it failed with `expected 0 to be greater than 0` before this flag was added.
  try {
    const response = await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword!,
        newPassword: input.newPassword!,
        revokeOtherSessions: true,
      },
      headers: await headers(),
      asResponse: true,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        code?: string;
      } | null;
      // A wrong current password is a CONTROLLED validation failure, not a
      // crash. better-auth signals it as `INVALID_PASSWORD`; anything else is
      // reported generically so no internal detail — and certainly no password —
      // escapes.
      if (body?.code === "INVALID_PASSWORD") {
        return actionFail("invalid", [
          { field: "currentPassword", code: "wrongPassword" },
        ]);
      }
      return actionFail("unknown");
    }

    // ── Forward better-auth's OWN replacement cookie ──────────────────────
    //
    // `revokeOtherSessions: true` makes better-auth delete EVERY session for
    // the account — including this caller's — and mint a replacement
    // (`update-user.mjs:174-176`). The replacement travels as a Set-Cookie on
    // the response, and a Server Action must hand it to the browser or the user
    // is signed out by their own password change.
    //
    // `nextCookies()` does not do this for an `auth.api.*` call: its `after`
    // hook re-imports `next/headers.js` (a different specifier from the
    // `next/headers` this file imports) and bails out when that resolution
    // fails. tests/server/profile-action.test.ts pins the behaviour — it
    // asserted `0` cookies written before this block existed.
    //
    // Nothing here INVENTS a cookie or reads a token: the value comes straight
    // from better-auth's response, parsed and option-mapped by better-auth's own
    // `parseSetCookieHeader` / `toCookieOptions`, and `cookieNameRegex` keeps it
    // to the auth cookies this app actually owns.
    for (const raw of response.headers.getSetCookie()) {
      for (const [name, attributes] of parseSetCookieHeader(raw)) {
        if (!cookieNameRegex.test(name)) continue;
        (await cookies()).set(
          name,
          attributes.value,
          toCookieOptions(attributes),
        );
      }
    }

    return actionOk(undefined);
  } catch {
    // A thrown error is still reported generically: the message could carry a
    // driver string or a credential.
    return actionFail("unknown");
  }
}
