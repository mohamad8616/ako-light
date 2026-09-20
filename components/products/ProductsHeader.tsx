"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PagesHeader from "../ui/PagesHeader";

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
      <PagesHeader title={title} />
  );
}
