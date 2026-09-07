"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface SearchInputHandle {
  focus: () => void;
}

interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
  className?: string;
}

const SearchInput = forwardRef<SearchInputHandle, SearchInputProps>(
  function SearchInput({ value, onChange, onClear, className }, ref) {
    const { t, lang } = useLanguage();
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Expose focus() to the parent so it can autofocus on mount.
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Fallback autofocus (works even if a parent never calls .focus()).
    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    return (
      <div className={cn("relative w-full", className)}>
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
          dir={lang === "fa" ? "rtl" : "ltr"}
          className={cn(
            "text-background-secondary w-full appearance-none border-0",
            "bg-transparent py-2 pr-10 pl-0 outline-none",
            "text-3xl leading-[1.1] tracking-tight",
            lang === "fa"
              ? "font-noora leading-normal"
              : "font-din leading-[0.95] tracking-tight",
            "placeholder:text-background-secondary/40",
          )}
        />

        {value.length > 0 && (
          <motion.button
            type="button"
            onClick={onClear}
            aria-label={t("search.clear")}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              lang === "fa" ? "left-0" : "right-0",
              "text-red-500 transition-opacity hover:opacity-70",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              focusable={false}
              className="h-6 w-6 md:h-7 md:w-7"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </motion.button>
        )}
      </div>
    );
  },
);

export default SearchInput;
