"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { menu } from "./data";
import MenuColumn from "./menuColumn";

// import MenuColumn from "./MenuColumn";
// import { menu } from "./MenuData";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FullscreenMenu({ open, onClose }: Props) {
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
          className="fixed inset-0 z-999 bg-black text-white"
        >
          {/* Top */}

          <div className="flex items-center justify-between px-8 pt-8 md:px-20">
            <h1 className="text-3xl tracking-[0.25em] font-semibold">HENGE</h1>

            <button onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          {/* Menu */}

          <div
            className="
            mx-auto
            mt-24
            grid
            max-w-7xl
            grid-cols-2
            gap-x-10
            gap-y-16
            px-8

            lg:grid-cols-4
            lg:px-20
            "
          >
            {menu.map((section, index) => (
              <MenuColumn
                key={section.title}
                title={section.title}
                links={section.links}
                delay={index * 0.12}
              />
            ))}
          </div>

          {/* Bottom */}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: 0.55,
            }}
            className="
            absolute
            bottom-8
            left-8
            right-8
            flex
            items-end
            justify-between

            lg:left-20
            lg:right-20
            "
          >
            <div>
              <p className="text-white">English</p>

              <p className="mt-2 text-neutral-500">Italiano</p>
            </div>

            <p className="text-neutral-600">Credits</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
