"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  underline?: boolean;
  required?: boolean;
}

export default function ConsentCheckbox({
  checked,
  onChange,
  children,
  underline,
  required,
}: ConsentCheckboxProps) {
  const { lang } = useLanguage();
  return (
    <label className="flex cursor-pointer items-start gap-4">
      <span className="relative mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/40">
        <input
          type="checkbox"
          checked={checked}
          required={required}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <span className="h-2 w-2 rounded-full bg-transparent transition-colors peer-checked:bg-white" />
      </span>
      <span
        className={cn(
          "text-xs leading-relaxed tracking-tight text-stone-300 uppercase",
          lang === "fa" ? "font-noora" : "font-din",
          underline ? "underline underline-offset-2" : "",
        )}
      >
        {children}
      </span>
    </label>
  );
}
