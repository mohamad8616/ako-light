"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

interface FormTextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}

export default function FormTextarea({
  label,
  name,
  value,
  onChange,
}: FormTextareaProps) {
  const { lang } = useLanguage();
  return (
    <label className="flex flex-col gap-3">
      <span
        className={cn(
          "text-sm font-normal text-white",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {label}
      </span>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={cn(
          "resize-none border-b border-white/20 bg-transparent pb-3 text-sm text-white outline-none transition-colors focus:border-white",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      />
    </label>
  );
}
