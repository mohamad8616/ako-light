"use client";

import { FieldRow, FormCard } from "@/components/admin/catalog/fields/form";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeOwnPasswordAction } from "@/lib/admin/actions/profile";
import { validateChangePassword } from "@/lib/admin/schemas/profile";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useForm } from "react-hook-form";

/** The three fields the form owns. There is no target/account field. */
type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY: ChangePasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

/**
 * Change-password form (Pass C.2).
 *
 * The policy is NOT re-implemented here. Both this form and the server action
 * call the same `validateChangePassword`, so the 12-character floor, the
 * confirmation field and the same-as-current rule cannot drift apart — and a
 * forged POST gets exactly the same treatment as a typo.
 *
 * Field errors from the server are rendered through `applyFieldIssues`, which
 * maps each `AdminErrorCode` to `admin.error.<code>` in the active locale, so
 * the message a user sees is identical whether it came from this client pass or
 * from better-auth rejecting the current password.
 *
 * The values are cleared on success only. Nothing is written to the URL, to
 * `localStorage`, or to the console.
 */
export function ChangePasswordForm() {
  const { t } = useLanguage();
  const { run, pending, applyFieldIssues } = useCrudSubmit();

  const form = useForm<ChangePasswordValues>({ defaultValues: EMPTY });

  const onSubmit = form.handleSubmit(async (values) => {
    // Client pass first: instant feedback, and one less round trip on a typo.
    const issues = validateChangePassword(values);
    if (issues.length > 0) {
      applyFieldIssues(form, { ok: false, formError: "invalid", issues });
      return;
    }

    const result = await run(() => changeOwnPasswordAction(values), {
      successMessage: t("admin.profile.passwordChanged"),
    });

    if (!result) return;
    if (result.ok) {
      // Clear the sensitive inputs so they do not linger in the DOM.
      form.reset(EMPTY);
      return;
    }
    applyFieldIssues(form, result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormCard
        title={t("admin.profile.password.card")}
        description={t("admin.profile.password.hint")}
      >
        <div className="space-y-5">
          <FieldRow
            label={t("admin.profile.password.current")}
            htmlFor="currentPassword"
            required
            error={form.formState.errors.currentPassword}
          >
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              disabled={pending}
              {...form.register("currentPassword")}
            />
          </FieldRow>

          <FieldRow
            label={t("admin.profile.password.new")}
            htmlFor="newPassword"
            required
            error={form.formState.errors.newPassword}
          >
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              disabled={pending}
              {...form.register("newPassword")}
            />
          </FieldRow>

          <FieldRow
            label={t("admin.profile.password.confirm")}
            htmlFor="confirmPassword"
            required
            error={form.formState.errors.confirmPassword}
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={pending}
              {...form.register("confirmPassword")}
            />
          </FieldRow>
        </div>
      </FormCard>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending
            ? t("admin.profile.password.saving")
            : t("admin.profile.password.submit")}
        </Button>
      </div>
    </form>
  );
}
