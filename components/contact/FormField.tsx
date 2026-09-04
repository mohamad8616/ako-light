"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  type?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}

export default function FormField({
  label,
  required,
  type = "text",
  name,
  value,
  onChange,
}: FormFieldProps) {
  const { lang } = useLanguage();
  return (
    <label className="flex flex-col gap-3">
      <span
        className={cn(
          "text-sm font-normal text-white",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      >
        {label} {required && <span aria-hidden="true">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "border-b border-white/20 bg-transparent pb-3 text-sm text-white outline-none transition-colors focus:border-white",
          lang === "fa" ? "font-noora" : "font-din",
        )}
      />
    </label>
  );
}
