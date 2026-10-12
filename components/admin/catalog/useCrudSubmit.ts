"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ActionResult } from "@/lib/admin/result";
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
 */
export function useCrudSubmit() {
  const { t } = useLanguage();
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
    [t],
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
   * the BROWSER's own validation fails — so without this the operator sees a
   * button that did nothing at all: no request, no pending state, no toast,
   * indistinguishable from a broken form. Pass D.1 hit exactly that (a
   * half-filled localized pair blocked the hero's Save), and the hook's own
   * documented contract is "toast on success and on failure (never a silent
   * failure)" — a blocked submit is a failure.
   */
  const notifyInvalid = React.useCallback((): void => {
    toast.error(t("admin.crud.checkFields"));
  }, [t]);

  return { run, pending, applyFieldIssues, notifyInvalid, router, t };
}
