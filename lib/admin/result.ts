import type { z } from "zod";

/**
 * The standard result contract for every admin server action.
 *
 * Errors are STRUCTURED CODES, never pre-formatted strings: the dictionaries
 * (lib/i18n/translations/admin.ts) own the copy for both locales, so the
 * client renders `t("admin.error." + code)` and no server action can leak
 * English-only prose into the Persian-first admin.
 */

/** Machine-readable error kinds, 1:1 with the `admin.error.*` dictionary keys. */
export type AdminErrorCode =
  | "invalid"
  | "required"
  | "slugTaken"
  | "notFound"
  | "relationViolation"
  | "unknown";

/** One failing form field, addressed by its form path ("slug", "name.en", …). */
export interface AdminFieldIssue {
  field: string;
  code: AdminErrorCode;
}

export type ActionResult<TData = undefined> =
  | { ok: true; data: TData }
  | { ok: false; formError: AdminErrorCode; issues: AdminFieldIssue[] };

export function actionOk<TData>(data: TData): ActionResult<TData> {
  return { ok: true, data };
}

export function actionFail(
  formError: AdminErrorCode,
  issues: AdminFieldIssue[] = [],
): ActionResult<never> {
  return { ok: false, formError, issues };
}

/**
 * Maps a client-side issue type (the zod issue code zodResolver stores as the
 * RHF error `type`) to the same dictionary codes the server mapping produces,
 * so a field shows the identical message whether validation failed locally or
 * in the action.
 */
export function errorCodeForType(type: unknown): AdminErrorCode {
  return type === "invalid_type" || type === "too_small"
    ? "required"
    : "invalid";
}

/**
 * Maps a zod failure into structured field issues.
 *
 * Schemas deliberately carry NO per-field prose: the zod issue `code` decides
 * the dictionary key, so a rule change never needs a translation change.
 * (`required` for missing/wrong-typed values, `invalid` for everything else.)
 */
export function zodIssuesToFieldIssues(error: z.ZodError): AdminFieldIssue[] {
  const issues: AdminFieldIssue[] = [];
  for (const issue of error.issues) {
    // Empty-string rules are expressed as `.min(1)`, so zod reports them as
    // too_small with a string origin — semantically "required", not "invalid".
    // Wrong-typed/missing values are invalid_type. Everything else is invalid.
    const isRequired =
      issue.code === "invalid_type" ||
      (issue.code === "too_small" &&
        "origin" in issue &&
        issue.origin === "string");
    const code: AdminErrorCode = isRequired ? "required" : "invalid";
    const field = issue.path.join(".");
    const existing = issues.find((candidate) => candidate.field === field);
    if (existing) {
      if (existing.code === "invalid" && code === "required")
        existing.code = "required";
    } else {
      issues.push({ field, code });
    }
  }
  return issues;
}
