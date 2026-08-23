"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // adjust import path
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import UnderLineEffect from "./UnderLineEffect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const linkClasses =
  "w-fit font-din text-sm tracking-tighter text-white uppercase no-underline transition-colors hover:text-stone-400 text-center";
const categories = [
  "LIGHTING",
  "DESIGNERS",
  "BOOKCASES",
  "CABINETS AND SIDEBOARDS",
  "TABLES",
  "COFFEE TABLES",
  "SOFAS AND ARMCHAIRS",
  "CHAIRS AND STOOLS",
  "KITCHENS",
  "BEDROOM",
  "WALL PANELLING",
  "ACCESSORIES",
];

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export default function ProductsSheet({ open, onOpenChange }: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const actionsRef = useRef<{ unmount: () => void; close: () => void } | null>(
    null,
  );

  const closeSheet = () => onOpenChange(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen) {
          // Keep the popup mounted so the framer-motion exit animation can play.
          eventDetails.preventUnmountOnClose();
        }
        onOpenChange(nextOpen);
      }}
      actionsRef={actionsRef}
    >
      {/* ---------- CUSTOM TRIGGER ---------- */}
      <SheetTrigger className="font-din relative z-50 h-5 cursor-pointer overflow-hidden text-sm font-normal tracking-tighter uppercase focus:outline-none">
        <span
          className={`block transition-transform duration-300 ease-in-out ${
            open ? "-translate-y-full" : "translate-y-0"
          }`}
        >
          products
        </span>
        <span
          className={`absolute top-full left-0 block transition-transform duration-300 ease-in-out ${
            open ? "-translate-y-full" : "translate-y-0"
          }`}
        >
          close
        </span>
      </SheetTrigger>

      {/* ---------- SHEET CONTENT ---------- */}
      <SheetContent
        side={isMobile ? "top" : "right"}
        className="border-0 bg-stone-950 p-6 text-white outline-0"
        motionProps={{
          initial: { x: isMobile ? 0 : 400 },
          animate: { x: 0 },
          exit: { opacity: 1, x: 400 },
          transition: { duration: 0.8, delay: 1, ease: "easeInOut" },
        }}
        onExitComplete={() => actionsRef.current?.unmount()}
      >
        <div className="font-din flex h-full flex-col items-start justify-center gap-6">
          <Link
            href="/products"
            className={`${linkClasses} relative mb-6 cursor-pointer`}
          >
            all Products
            <UnderLineEffect />
          </Link>
          {/* Navigation list */}
          <nav className="flex flex-col items-start justify-center space-y-2 text-center">
            {categories.map((item) => (
              <Link
                key={item}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  closeSheet();
                }}
                className={linkClasses}
              >
                {item}
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
