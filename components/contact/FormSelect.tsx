"use client";

import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

interface FormSelectProps {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export default function FormSelect({
  label,
  name,
  value,
  options,
  onChange,
}: FormSelectProps) {
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
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none border-b border-white/20 bg-transparent pb-3 pr-8 text-sm text-white outline-none transition-colors focus:border-white",
            lang === "fa" ? "font-noora" : "font-din",
          )}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-stone-950 text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute right-0 bottom-3 text-white"
        />
      </div>
    </label>
  );
}
