import type { AdminFieldIssue } from "@/lib/admin/result";

/**
 * Profile form rules (Pass C.2).
 *
 * PURE — no prisma, no better-auth, no `process`, so the policy is unit-testable
 * without a server. The action in lib/admin/actions/profile.ts owns the
 * authorization and the better-auth call.
 *
 * Issues are `{ field, code }` pairs from the shared `AdminErrorCode` union, not
 * sentences: the dictionaries own the copy for both locales, so the form renders
 * `t("admin.error." + code)` and nothing English-only can leak into the
 * Persian-first admin. The SAME function runs on the client (via zodResolver's
 * sibling check in the form) and in the action, so a forged POST cannot skip a
 * rule the form enforced.
 */

/**
 * The minimum length for a new password.
 *
 * 12, not better-auth's default of 8 (`context/create-context.mjs`
 * `minPasswordLength`). These are STAFF accounts — the highest-privilege
 * accounts in the system — so they are held to the same floor the owner
 * bootstrap uses (lib/auth/owner-bootstrap-input.ts).
 */
export const PROFILE_PASSWORD_MIN_LENGTH = 12;

/** An upper bound, so a pasted blob cannot become a denial-of-service. */
export const PROFILE_PASSWORD_MAX_LENGTH = 128;

export interface ChangePasswordInput {
  currentPassword: string | undefined;
  newPassword: string | undefined;
  confirmPassword: string | undefined;
}

/**
 * Every problem with the input, in a stable field order.
 *
 * An empty array means the input is usable. A problem NEVER contains a password
 * value — only a field name and a dictionary code.
 */
export function validateChangePassword(
  input: ChangePasswordInput,
): AdminFieldIssue[] {
  const issues: AdminFieldIssue[] = [];

  const current = input.currentPassword ?? "";
  const next = input.newPassword ?? "";
  const confirm = input.confirmPassword ?? "";

  if (!current) {
    issues.push({ field: "currentPassword", code: "required" });
  }

  if (!next) {
    issues.push({ field: "newPassword", code: "required" });
  } else {
    if (next.length < PROFILE_PASSWORD_MIN_LENGTH) {
      issues.push({ field: "newPassword", code: "tooShort" });
    }
    if (next.length > PROFILE_PASSWORD_MAX_LENGTH) {
      issues.push({ field: "newPassword", code: "tooLong" });
    }
    // Reusing the current password is not a change at all, and better-auth
    // rejects it as `PASSWORD_SAME_AS_CURRENT` anyway — caught here so the user
    // gets a clear, localized message before a round trip.
    if (current && next === current) {
      issues.push({ field: "newPassword", code: "sameAsCurrent" });
    }
  }

  // Confirmation is a UI guarantee, checked server-side too: the action is a
  // public endpoint and must not rely on the form having two fields.
  if (!confirm) {
    issues.push({ field: "confirmPassword", code: "required" });
  } else if (next && confirm !== next) {
    issues.push({ field: "confirmPassword", code: "passwordMismatch" });
  }

  return issues;
}
