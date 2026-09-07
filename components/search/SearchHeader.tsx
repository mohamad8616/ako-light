"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import HomepageSection, { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import SearchInput, { type SearchInputHandle } from "./SearchInput";
import SearchResults from "./SearchResults";

const SEARCH_DEBOUNCE_MS = 300;

export default function SearchHeader() {
  const { t, lang } = useLanguage();
  const [query, setQuery] = useState("");
  // The input keeps the raw value so typing stays instant; the results
  // pipeline only re-renders after the user pauses for SEARCH_DEBOUNCE_MS.
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const inputRef = useRef<SearchInputHandle | null>(null);

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <header className="bg-background w-full pt-28 md:pt-36">
      <HomepageSection>
        {/* Small caption + horizontal rule (matches the rest of the site) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="border-b border-white/15 pb-4"
        >
          <span className="text-xs font-medium tracking-[0.2em] text-white/70 uppercase">
            {t("search.title")}
          </span>
        </motion.div>

        {/* Search input */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          className="mt-2 overflow-hidden pb-10 md:mt-4 md:pb-16"
        >
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={setQuery}
            onClear={handleClear}
          />
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className={cn(lang === "fa" ? "font-noora" : "font-din")}
        >
          <SearchResults query={debouncedQuery} />
        </motion.div>
      </HomepageSection>
    </header>
  );
}
