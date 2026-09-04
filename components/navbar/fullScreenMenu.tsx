"use client";

import { useLenis } from "@/lib/lenisStore";
import { EASE } from "@/utility/HomepageSection";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { menu } from "../header/data";
import MenuBtns from "./MenuBtns";
import MenuColumn from "./menuColumn";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FullscreenMenu({ open, onClose }: Props) {
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
        <>
          {/* Bottom overlay — covers the area the menu doesn't reach */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.75,
              ease: EASE,
              delay: 0.7,
            }}
            onClick={onClose}
            className="fixed inset-x-0 bottom-0 z-998 h-16 bg-black/80 backdrop-blur-xs supports-backdrop-filter:backdrop-blur-sm md:h-24"
          />

          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{
              y: "-100%",
              // Close: let the links slide down out of view first (they
              // finish by ~0.6s), then slide the panel back up.
              transition: { duration: 0.75, ease: EASE, delay: 0.5 },
            }}
            transition={{
              duration: 0.75,
              ease: EASE,
              delay: 0.7,
            }}
            className="bg-background no-scrollbar text-background-secondary fixed inset-x-0 top-0 bottom-16 z-999 flex scrollbar-thin flex-col overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:bottom-24"
          >
            {/* Menu Columns — vertically centered in the remaining space */}
            <div className="flex flex-1 flex-col justify-center">
              <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-x-10 gap-y-10 px-8 py-10 md:px-20 md:py-12 lg:grid-cols-4">
                {menu.map((section, index) => (
                  <div key={section.title}>
                    <MenuColumn
                      titleKey={section.i18nKey}
                      links={section.links}
                      delay={0.5 + index * 0.12}
                      // Panel lands at ~1.45s (delay 0.7 + duration 0.75);
                      // links reveal from bottom to top after that, staggered
                      // per column and per link.
                      linksDelay={1.45 + index * 0.1}
                      onLinkClick={onClose}
                    />
                  </div>
                ))}
              </div>
            </div>
          <MenuBtns onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
