"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ActionResult } from "@/lib/admin/result";
import {
  formFillIssueLabelKeys,
  formatFieldLabelList,
  labelKeysForFormErrors,
} from "@/lib/admin/field-labels";
import { useRouter } from "next/navigation";
import type {
  FieldPath,
  FieldValues,
  UseFormReturn,
} from "react-hook-form";
import { toast } from "sonner";
import * as React from "react";

/**
 * Every create/update/delete call in the admin goes through this hook, so the
 * feedback contract is identical everywhere:
 *
 *   - sonner toast on success and on failure (never a silent failure);
 *   - the structured `ActionResult` returned to the caller, which maps its
 *     field issues onto react-hook-form via `setError` (field-level messages);
 *   - a `pending` flag for submit buttons;
 *   - NO router.refresh() here on purpose: the server action's
 *     `revalidateCatalog()` already refreshes the current page — callers that
 *     must NAVIGATE (create -> detail page, delete from a detail page) do it in
 *     their `onSuccess`.
 *
 * ── The failure toast NAMES the fields ──────────────────────────────────────
 *
 * A blocked save used to produce the same sentence every time, so the operator
 * had to hunt the page for the empty input. Both failure paths now resolve the
 * failing paths through the shared label registry (lib/admin/field-labels.ts):
 * "Please complete the required fields: Name, Slug, Image gallery." When
 * nothing resolves — a server-born code like slugTaken, or a path no label
 * knows — the specific code message (or the generic one) is shown instead, so
 * a message is never WORSE than before.
 */
export function useCrudSubmit() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const run = React.useCallback(
    async <TData,>(
      action: () => Promise<ActionResult<TData>>,
      options: {
        /** Shown on success; defaults to the shared "saved" message. */
        successMessage?: string;
        /** Called only when the action succeeded (`data` = new id on create). */
        onSuccess?: (data: TData) => void;
      } = {},
    ): Promise<ActionResult<TData> | null> => {
      setPending(true);
      try {
        const result = await action();
        if (result.ok) {
          toast.success(options.successMessage ?? t("admin.table.saved"));
          options.onSuccess?.(result.data);
          return result;
        }
        // Plain form-fill failures (unfilled inputs, a below-floor list) are
        // better said as a LIST of field names than as one blanket sentence…
        const labelKeys = formFillIssueLabelKeys(result.issues);
        if (labelKeys.length > 0) {
          const fields = formatFieldLabelList(t, labelKeys, lang);
          toast.error(
            t("admin.crud.checkFieldsNamed").replace("{fields}", fields),
          );
          return result;
        }
        // …but a server-born code (slugTaken, notFound, inUse…) already has a
        // specific sentence of its own — keep it.
        const code = result.issues[0]?.code ?? result.formError;
        toast.error(t(`admin.error.${code}`));
        return result;
      } catch {
        // The action rethrows unknown errors on purpose; the toast keeps the
        // admin usable while the server log carries the stack.
        toast.error(t("admin.error.unknown"));
        return null;
      } finally {
        setPending(false);
      }
    },
    [t, lang],
  );

  /** Field issues -> react-hook-form errors, with translated messages. */
  const applyFieldIssues = React.useCallback(
    <TFieldValues extends FieldValues>(
      form: UseFormReturn<TFieldValues>,
      result: Extract<ActionResult<unknown>, { ok: false }>,
    ): void => {
      for (const issue of result.issues) {
        form.setError(issue.field as FieldPath<TFieldValues>, {
          type: issue.code,
          message: t(`admin.error.${issue.code}`),
        });
      }
    },
    [t],
  );

  /**
   * Pass to `form.handleSubmit(onValid, notifyInvalid)`.
   *
   * react-hook-form renders the field errors but does NOT call the action when
   * the browser's (or the zodResolver's) validation fails — so without this the
   * operator sees a button that did nothing at all: no request, no pending
   * state, no toast, indistinguishable from a broken form. Pass D.1 hit exactly
   * that (a half-filled localized pair blocked the hero's Save), and the hook's
   * own documented contract is "toast on success and on failure (never a
   * silent failure)" — a blocked submit is a failure.
   *
   * The toast now NAMES the unfilled fields (resolved through the label
   * registry); the generic message remains the fallback for paths no label
   * covers — their inline red message still points at them.
   */
  const notifyInvalid = React.useCallback(
    (errors?: unknown): void => {
      const labelKeys = labelKeysForFormErrors(errors);
      if (labelKeys.length > 0) {
        const fields = formatFieldLabelList(t, labelKeys, lang);
        toast.error(
          t("admin.crud.checkFieldsNamed").replace("{fields}", fields),
        );
        return;
      }
      toast.error(t("admin.crud.checkFields"));
    },
    [t, lang],
  );

  return { run, pending, applyFieldIssues, notifyInvalid, router, t };
}
