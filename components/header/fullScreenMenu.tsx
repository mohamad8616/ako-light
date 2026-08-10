"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import HengeLogo from "@/components/ui/HengeLogo";
import { menu } from "./data";
import MenuColumn from "./menuColumn";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FullscreenMenu({ open, onClose }: Props) {
  const { t } = useLanguage();

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
          className="fixed inset-0 z-999 bg-black text-white overflow-y-auto"
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

          {/* Menu */}
          <div className="mx-auto mt-16 grid max-w-7xl grid-cols-2 gap-x-10 gap-y-14 px-8 md:mt-24 md:px-20 lg:grid-cols-4">
            {menu.map((section, index) => (
              <MenuColumn
                key={section.title}
                title={section.title}
                links={section.links}
                delay={index * 0.12}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}