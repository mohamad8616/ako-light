"use client";

import { DeleteDialog } from "@/components/admin/catalog/DeleteDialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/admin/result";
import LocaleLink from "@/lib/i18n/Link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Pencil, Trash2 } from "lucide-react";
import * as React from "react";

/**
 * One table row's edit/delete pair — the only per-entity actions the kit
 * provides, so every section's table looks and behaves identically.
 *
 *   - dedicated-page sections pass `editHref` (locale-aware link);
 *   - dialog sections pass `onEdit`;
 *   - `onDestroy` runs the section's destroy action through `useCrudSubmit` and
 *     is awaited by the confirm dialog, so the dialog closes only on success;
 *   - `deleteWarning` carries the (already translated) cascade line.
 */
export function RowActions({
  editHref,
  onEdit,
  onDestroy,
  deleteWarning,
}: {
  editHref?: string;
  onEdit?: () => void;
  onDestroy?: () => Promise<ActionResult<unknown> | null>;
  deleteWarning?: string;
}) {
  const { t } = useLanguage();
  const [confirming, setConfirming] = React.useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      {editHref ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("admin.table.edit")}
          render={
            <LocaleLink
              href={editHref}
              className="flex items-center justify-center"
            />
          }
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("admin.table.edit")}
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onDestroy ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10"
          aria-label={t("admin.table.delete")}
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}

      <DeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        warning={deleteWarning}
        onConfirm={async () => {
          if (!onDestroy) return;
          const result = await onDestroy();
          if (result?.ok) setConfirming(false);
        }}
      />
    </div>
  );
}
