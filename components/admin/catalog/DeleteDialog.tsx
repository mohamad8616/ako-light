"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import * as React from "react";

/**
 * The one delete confirmation every section reuses.
 *
 * Deliberately dumb: the caller supplies the (already translated) warning copy
 * — e.g. a cascade count for categories — and runs the destroy action itself,
 * so the dialog stays identical across the dialog-pattern and page-pattern
 * sections. `dir` follows ADMIN_SHELL_DIR because the popup renders into
 * document.body, outside the shell's RTL wrapper (see components/ui/direction).
 */
export function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  warning,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Already-translated title (the shared default lives in the dictionary). */
  title?: string;
  /** Already-translated body line (defaults to the shared description). */
  description?: string;
  /** Already-translated cascade warning, e.g. "N products will be removed". */
  warning?: string;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [pending, setPending] = React.useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={ADMIN_SHELL_DIR} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {title ?? t("admin.crud.deleteTitle")}
          </DialogTitle>
          <DialogDescription>
            {description ?? t("admin.crud.deleteDescription")}
          </DialogDescription>
          {warning ? (
            <p className="bg-warning/10 text-warning rounded-md px-3 py-2 text-xs font-medium">
              {warning}
            </p>
          ) : null}
        </DialogHeader>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t("admin.crud.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={handleConfirm}
          >
            {t("admin.table.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
