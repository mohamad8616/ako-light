"use client";

import { useLenis } from "@/lib/lenisStore";
import { EASE } from "@/utility/HomepageSection";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { menu } from "../header/data";
import MenuBtns from "./MenuBtns";
import MenuColumn from "./menuColumn";

// ----- timing constants (seconds) -----

/** Bottom-overlay fade-in delay (after the panel starts landing). */
const OVERLAY_FADE_DELAY = 0.25;
/** Panel slide-down duration (matches overlay fade). */
const PANEL_DURATION = 0.4;
/** Exit: panel slides back up after the links have receded. */
const PANEL_EXIT_DELAY = 0.5;
/** First column reveal — after the panel has landed (delay + duration). */
const FIRST_COLUMN_DELAY = 0.5;
/** Per-column stagger on entry. */
const COLUMN_STAGGER = 0.12;
/** First link reveal — panel lands at ~1.45s. */
const FIRST_LINK_DELAY = 1.45;
/** Per-link stagger inside a column. */
const LINK_STAGGER = 0.1;

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Fullscreen overlay menu. Mounts only when `open` (via `AnimatePresence`)
 * so its scroll-lock and keydown listener are only alive while visible.
 */
export default function FullscreenMenu({ open, onClose }: Props) {
  const { lock, unlock } = useLenis();

  // Lock body scroll while the menu is open; release on close.
  useEffect(() => {
    if (open) lock();
    else unlock();
  }, [open, lock, unlock]);

  // Belt-and-suspenders: release scroll if the component unmounts
  // while still locked (e.g. user navigates while menu is open).
  useEffect(() => () => unlock(), [unlock]);

  // Close on Escape. Listener is only attached while open, so there's
  // no need to filter for `open` inside the handler.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Bottom strip — covers the area the menu doesn't reach and
              closes the menu on click. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: PANEL_DURATION,
              ease: EASE,
              delay: OVERLAY_FADE_DELAY,
            }}
            onClick={onClose}
            className="fixed inset-x-0 bottom-0 z-998 h-16 bg-black/80 backdrop-blur-xs supports-backdrop-filter:backdrop-blur-sm md:h-24"
          />

          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{
              y: "-100%",
              transition: {
                duration: PANEL_DURATION,
                ease: EASE,
                delay: PANEL_EXIT_DELAY,
              },
            }}
            transition={{
              duration: PANEL_DURATION,
              ease: EASE,
              delay: OVERLAY_FADE_DELAY,
            }}
            className="bg-background no-scrollbar text-background-secondary fixed inset-x-0 top-0 bottom-16 z-999 flex scrollbar-thin flex-col overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:bottom-24"
          >
            {/* Vertically center the columns in the remaining viewport. */}
            <div className="flex flex-1 flex-col justify-center">
              <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-x-10 gap-y-10 px-8 py-10 md:px-20 md:py-12 lg:grid-cols-4">
                {menu.map((section, index) => (
                  <div key={section.title}>
                    <MenuColumn
                      titleKey={section.i18nKey}
                      links={section.links}
                      delay={FIRST_COLUMN_DELAY + index * COLUMN_STAGGER}
                      linksDelay={FIRST_LINK_DELAY + index * LINK_STAGGER}
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
