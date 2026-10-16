"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * The submit row every section form ends with.
 *
 * There is deliberately no cancel link: these forms sit inline on their page's
 * section list — the About and S34 editors and, since it became one page, the
 * homepage editor — and each keeps its own unsaved state, so "cancel" has
 * nowhere to navigate back to.
 */
export function SectionFormActions({ pending }: { pending: boolean }) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-end">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("admin.table.saving") : t("admin.crud.save")}
      </Button>
    </div>
  );
}