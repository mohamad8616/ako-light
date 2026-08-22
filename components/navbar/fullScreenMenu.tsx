"use client";

import HengeLogo from "@/components/ui/HengeLogo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useLenis } from "@/lib/lenisStore";
import { EASE } from "@/utility/HomepageSection";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { menu } from "../header/data";
import MenuColumn from "./menuColumn";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FullscreenMenu({ open, onClose }: Props) {
  const { t, lang, setLang } = useLanguage();
  const { lock, unlock } = useLenis();

  useEffect(() => {
    if (open) lock();
    else unlock();
  }, [open, lock, unlock]);

  // Ensure scroll is never left locked if the menu unmounts.
  useEffect(() => () => unlock(), [unlock]);

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
            ease: EASE,
            delay: 0.7,
          }}
          className="bg-background no-scrollbar text-background-secondary fixed inset-x-0 top-0 bottom-16 z-999 flex scrollbar-thin flex-col overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:bottom-24"
        >
          {/* Top */}
          <div className="flex items-center justify-between px-8 pt-6 md:px-20 md:pt-8">
            <HengeLogo className="h-auto w-24 fill-white" />

            <button
              onClick={onClose}
              className="cursor-pointer transition hover:opacity-70"
              aria-label={t("nav.close")}
            >
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </div>

          {/* Menu Columns — vertically centered in the remaining space */}
          <div className="flex flex-1 flex-col justify-center">
            <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-x-10 gap-y-10 px-8 py-10 md:px-20 md:py-12 lg:grid-cols-4">
              {menu.map((section, index) => (
                <div key={section.title}>
                  <MenuColumn
                    titleKey={section.i18nKey}
                    links={section.links}
                    delay={0.5 + index * 0.12}
                    onLinkClick={onClose}
                  />

                  {/* Language switcher sits under the first (Company) column */}
                  {index === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.85 }}
                      className="mt-8 flex flex-col gap-1.5 md:mt-12"
                    >
                      <button
                        onClick={() => setLang("en")}
                        className={`w-fit cursor-pointer text-left text-sm font-medium tracking-[0.08em] uppercase transition-colors duration-300 ${
                          lang === "en"
                            ? "text-white"
                            : "text-white/30 hover:text-white/60"
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => setLang("fa")}
                        className={`w-fit cursor-pointer text-left text-sm font-medium tracking-[0.08em] transition-colors duration-300 ${
                          lang === "fa"
                            ? "text-white"
                            : "text-white/30 hover:text-white/60"
                        }`}
                      >
                        فارسی
                      </button>
                    </motion.div>
                  )}

                  {/* Credits sits under the last (Network) column */}
                  {index === menu.length - 1 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.85 }}
                      className="mt-8 md:mt-12"
                    >
                      <Link
                        href="/credits"
                        onClick={onClose}
                        className="text-sm font-light tracking-[0.08em] text-white/30 uppercase transition-colors duration-300 hover:text-white/60"
                      >
                        {t("footer.credits")}
                      </Link>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
