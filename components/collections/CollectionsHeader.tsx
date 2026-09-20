"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PagesHeader from "../ui/PagesHeader";

export default function CollectionsHeader() {
  const { t } = useLanguage();
  return <PagesHeader title={t("nav.collections")} />;
}
