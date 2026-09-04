"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PageTitle from "@/utility/PageTitle";

export default function MaterialsHeader() {
  const { t } = useLanguage();
  return (
    <header className="bg-background w-full pt-28 md:pt-36">
      <PageTitle>{t("materials.title")}</PageTitle>
    </header>
  );
}
