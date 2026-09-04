"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PageTitle from "@/utility/PageTitle";

export default function FlagshipHeader() {
  const { t } = useLanguage();
  return (
    <header className="w-full bg-background pt-28 md:pt-36">
      <PageTitle>{t("menu.flagships")}</PageTitle>
    </header>
  );
}
    