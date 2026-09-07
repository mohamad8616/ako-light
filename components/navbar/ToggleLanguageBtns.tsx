"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";

// ----- animation timing (seconds) -----

/** Delay before the language switcher appears (after the panel lands). */
const FADE_DELAY = 0.85;
/** Fade-in duration for the language switcher. */
const FADE_DURATION = 0.5;

/** The language switcher lives in the first column; the other three
 *  columns are empty in this layout, so we render three placeholders
 *  to keep the grid columns aligned on `lg+`. */
const EMPTY_COLUMN_COUNT = 3;

interface Props {
  onClose: () => void;
}

/**
 * Bottom-left of the fullscreen menu: language switcher.
 *
 * Sits in the first grid column; the remaining 3 columns are filled
 * with empty placeholders so the alignment matches the column grid
 * above.
 */
export default function MenuBtns({ onClose }: Props) {
  const { lang, setLang } = useLanguage();
  const fontForLang = lang === "fa" ? "font-noora" : "font-din";

  // Wrap setLang + onClose in a single call to keep the JSX terse.
  const switchTo = (next: "en" | "fa") => () => {
    setLang(next);
    onClose();
  };

  return (
    <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 items-center gap-x-10 pb-10 md:pb-12 lg:grid-cols-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: FADE_DURATION, delay: FADE_DELAY }}
        className="flex flex-col gap-1.5"
      >
        <LanguageButton
          label="English"
          active={lang === "en"}
          onClick={switchTo("en")}
          className={`${fontForLang} text-sm font-medium tracking-[0.08em] uppercase`}
        />

        {/* THIS ELEMENT ALWAYS MUST HAVE FONT-NOORA STYLE */}
        <LanguageButton
          label="فارسی"
          active={lang === "fa"}
          onClick={switchTo("fa")}
          className={`font-noora text-sm font-medium tracking-[0.08em]`}
        />
      </motion.div>

      {/* Empty placeholders so the language switcher stays in column 1
          on lg+ (matching the column grid above). */}
      {Array.from({ length: EMPTY_COLUMN_COUNT }).map((_, i) => (
        <div key={i} className="hidden lg:block" />
      ))}
    </div>
  );
}

// ----- internal -----

function LanguageButton({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-fit cursor-pointer text-left transition-colors duration-300 ${className ?? ""} ${
        active ? "text-white" : "text-white/30 hover:text-white/60"
      }`}
    >
      {label}
    </button>
  );
}
