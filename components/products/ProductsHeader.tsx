"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PageTitle from "@/utility/PageTitle";

interface ProductsHeaderProps {
  titleKey?: string;
  title?: string;
}

export default function ProductsHeader({
  titleKey,
  title: titleProp,
}: ProductsHeaderProps) {
  const { t } = useLanguage();
  const title = titleKey ? t(titleKey) : (titleProp ?? t("products.title"));

  return (
    <header className="bg-background w-full pt-28 md:pt-76">
      <PageTitle className="font-medium">{title}</PageTitle>
    </header>
  );
}
