"use client";

import PageTitle from "@/utility/PageTitle";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function DesignersHeader() {
  const { t } = useLanguage();
  return (
    <header className="w-full bg-background pt-28 md:pt-36">
      <PageTitle>{t("menu.designers")}</PageTitle>
    </header>
  );
}
