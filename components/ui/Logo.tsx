"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface AkoLightingLogoProps {
  className?: string;
}

export default function Logo({ className }: AkoLightingLogoProps) {
  const { lang } = useLanguage();

  return (
    <p className={`${lang === "fa" ? "font-noora" : "font-din"} text-lg font-medium ${className}`}>
      {lang === "fa" ? "هوم فرم" : "HOME FORM"}
    </p>
  );
}
