"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // adjust import path
import { productCategories } from "@/lib/data/productCategories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useLenis } from "@/lib/lenisStore";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import UnderLineEffect from "./UnderLineEffect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const linkClasses =
  "w-fit font-din text-sm tracking-tighter text-white uppercase no-underline transition-colors hover:text-stone-400 text-center";
// Noora for Persian, DinNext (default) for English, applied to the products links.
const categoryKeys = [
  "products.lighting",
  "products.designers",
  ...productCategories.map((c) => c.i18nKey),
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
  const { lock, unlock } = useLenis();
  const { lang } = useLanguage();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { t } = useLanguage();
  const actionsRef = useRef<{ unmount: () => void; close: () => void } | null>(
    null,
  );

  const closeSheet = () => onOpenChange(false);
  
  useEffect(() => {
    if (open) lock();
    else unlock();
  }, [open, lock, unlock]);

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
      <SheetTrigger className={`${lang === "fa" ? "font-noora" : "font-din"} relative z-50 h-5 cursor-pointer overflow-hidden text-sm font-normal tracking-tighter uppercase focus:outline-none`}>
        <span
          className={`block transition-transform duration-300 ease-in-out ${
            open ? "-translate-y-full" : "translate-y-0"
          }`}
        >
          {t("productsSheet.products")}
        </span>
        <span
          className={`absolute top-full left-0 block transition-transform duration-300 ease-in-out ${
            open ? "-translate-y-full" : "translate-y-0"
          }`}
        >
          {t("productsSheet.close")}
        </span>
      </SheetTrigger>

      {/* ----------DESKTOP SHEET CONTENT ---------- */}
      {!isMobile && (
        <SheetContent
          showCloseButton={false}
          side={lang === "fa" ? "left" : "right"}
          className="border-0 bg-stone-950 p-6 text-white outline-0"
          motionProps={{
            initial: { x: lang === "fa" ? -400 : 400 },
            animate: { x: 0 },
            exit: { opacity: 1, x: lang === "fa" ? -400 : 400 },
            transition: { duration: 0.8, delay: 1, ease: "easeInOut" },
          }}
          onExitComplete={() => actionsRef.current?.unmount()}
        >
          <div className={`${lang === "fa" ? "font-noora" : "font-din"} mt-9 flex h-full flex-col items-start justify-center gap-6`}>
            <Link
              href="/products"
              className={`${linkClasses} group relative mb-6 cursor-pointer`}
            >
              {t("productsSheet.allProducts")}
              <UnderLineEffect />
            </Link>
            {/* Navigation list */}
            <nav className="flex flex-col items-start justify-center space-y-4 text-center">
              {categoryKeys.map((key) => (
                <Link
                  key={key}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    closeSheet();
                  }}
                  className={`${linkClasses} group relative`}
                >
                  {t(key)}
                  <UnderLineEffect />
                </Link>
              ))}
            </nav>
          </div>
        </SheetContent>
      )}

      {/* ----------MOBILE SHEET CONTENT------------- */}
      {isMobile && (
        <SheetContent
          showCloseButton={false}
          side={"top"}
          className="scrollbar-auto border-0 bg-stone-950 p-6 pt-20 text-white outline-0"
          motionProps={{
            initial: { y: -1000 },
            animate: { y: 0 },
            exit: { y: -1000 },
            transition: { duration: 0.8, delay: 0.3, ease: "easeInOut" },
          }}
          onExitComplete={() => actionsRef.current?.unmount()}
        >
          <div className={`${lang === "fa" ? "font-noora" : "font-din"} mt-9 flex h-full flex-col items-center justify-center gap-6`}>
            <Link
              href="/products"
              className={`${linkClasses} group relative mb-6 cursor-pointer`}
            >
              {t("productsSheet.allProducts")}
              <UnderLineEffect />
            </Link>
            {/* Navigation list */}
            <nav className="flex flex-col items-center justify-center space-y-4 text-center">
              {categoryKeys.map((key) => (
                <Link
                  key={key}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    closeSheet();
                  }}
                  className={`${linkClasses} group relative`}
                >
                  {t(key)}
                  <UnderLineEffect />
                </Link>
              ))}
            </nav>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
