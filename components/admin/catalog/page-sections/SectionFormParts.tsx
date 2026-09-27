"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * The submit row every page-section form ends with.
 *
 * There is deliberately no cancel link: the section forms sit inline on their
 * page's section list and each keeps its own unsaved state, so "cancel" has
 * nowhere to navigate back to (the homepage slot forms cancel to their hub
 * because a slot owns a whole page).
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