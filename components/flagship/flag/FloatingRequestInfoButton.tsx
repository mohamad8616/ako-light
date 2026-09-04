"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export default function FloatingRequestInfoButton() {
  const { t, lang } = useLanguage();

  function scrollToForm() {
    document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <button
      onClick={scrollToForm}
      className={cn(
        "fixed right-6 bottom-6 z-40 cursor-pointer rounded-full bg-white px-6 py-3 text-xs font-medium tracking-tighter text-stone-950 uppercase shadow-lg transition-transform hover:scale-105 md:right-8 md:bottom-8",
        lang === "fa" ? "font-noora" : "font-din",
      )}
    >
      {t("flagship.requestInfo")}
    </button>
  );
}
