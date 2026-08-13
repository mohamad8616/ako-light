"use client";

import HengeLogo from "@/components/ui/HengeLogo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { menu } from "./data";
import MenuColumn from "./menuColumn";

interface Props {
  open: boolean;
  onClose: () => void;
}


export default function FullscreenMenu({ open, onClose }: Props) {
  const { t, lang, toggleLang } = useLanguage();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", close);

    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{
            duration: 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed inset-0 z-999 bg-background text-background-secondary overflow-y-auto"
        >
          {/* Top */}
          <div className="flex items-center justify-between px-8 pt-8 md:px-20 md:pt-10">
            <HengeLogo className="w-24 h-auto fill-white" />

            <button
              onClick={onClose}
              className="transition hover:opacity-70 cursor-pointer"
              aria-label={t("nav.close")}
            >
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </div>

          {/* Menu Columns */}
          <div className="mx-auto mt-12 grid max-w-7xl grid-cols-2 gap-x-10 gap-y-14 px-8 md:mt-16 md:px-20 lg:grid-cols-4">
            {menu.map((section, index) => (
              <MenuColumn
                key={section.title}
                title={section.title}
                links={section.links}
                delay={0.5 + index * 0.12}
              />
            ))}
          </div>

          {/* Bottom: Language Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mx-auto mt-16 max-w-7xl px-8 pb-12 md:px-20"
          >
            <button
              onClick={toggleLang}
              className="group flex items-center gap-3 text-sm font-light uppercase tracking-[0.2em] text-white/60 transition-colors duration-300 hover:text-white cursor-pointer"
            >
              <span className="inline-block h-px w-8 bg-white/30 transition-all duration-300 group-hover:w-12 group-hover:bg-white" />
              {lang === "en" ? "فارسی" : "English"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}