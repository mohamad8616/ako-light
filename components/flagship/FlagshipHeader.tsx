"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PagesHeader from "../ui/PagesHeader";

export default function FlagshipHeader() {
  const { t } = useLanguage();
  return (
      <PagesHeader title={t("menu.flagships")} />
  );
}
    