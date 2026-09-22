"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  FormProvider,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import * as React from "react";

/**
 * The shared create/edit dialog for the "dialog" sections.
 *
 * CRITICAL: the children are wrapped in react-hook-form's `FormProvider`. The
 * field kit (LocalizedField, SlugField, SelectField, NumberField…) reads its
 * form through `useFormContext()`, which returns `undefined` when no provider is
 * above it — the fields would then throw at RUNTIME while tsc and the build both
 * pass. Any form composed from the kit must be inside this provider (or its own
 * FormProvider), including the dedicated-page forms.
 *
 * The dialog content carries ADMIN_SHELL_DIR explicitly: it renders into
 * document.body, outside the shell's RTL wrapper, so under /en/admin it would
 * otherwise inherit the document's LTR.
 */
export function DialogFormShell<TValues extends FieldValues>({
  open,
  onClose,
  title,
  form,
  onSave,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Already-translated dialog title. */
  title: string;
  form: UseFormReturn<TValues>;
  /** Resolves true when the save succeeded — the dialog then closes itself. */
  onSave: (values: TValues) => Promise<boolean>;
  /** Wider layout for forms with image/bio lists. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const [pending, setPending] = React.useState(false);

  const submit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      if (await onSave(values)) onClose();
    } finally {
      setPending(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        dir={ADMIN_SHELL_DIR}
        className={wide ? "sm:max-w-2xl" : "sm:max-w-lg"}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormProvider {...form}>{children}</FormProvider>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={pending}
            >
              {t("admin.crud.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t("admin.table.saving") : t("admin.crud.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}