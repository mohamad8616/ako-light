"use client";

import Logo from "@/components/ui/Logo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useLoaderStore } from "@/lib/loaderStore";
import { useEffect, useState } from "react";

export default function Preloader() {
  const { isLoading, progress } = useLoaderStore();
  const { t, dir } = useLanguage();
  const [isGone, setIsGone] = useState(false);

  // After the fade-out transition completes, unmount the preloader entirely
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsGone(true), 900);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isGone) return null;

  return (
    <div
      id="loader"
      className={`bg-background fixed inset-0 z-1000 flex flex-col items-center justify-center transition-all delay-200 duration-1000 ease-[cubic-bezier(0.74,0,0.15,0.99)] ${!isLoading ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"} `}
    >
      {/* AKO Lighting Logo */}
      <Logo className="h-auto fill-white transition-opacity duration-500 ease-out" />

      {/* Progress Bar — grows from the right in RTL (Persian), from the
          left in LTR. */}
      <div
        className={`bg-background-secondary mt-4 h-0.5 w-20 ${
          dir === "rtl" ? "origin-right" : "origin-left"
        } transition-transform duration-100 ease-out`}
        style={{
          transform: `scaleX(${progress / 100})`,
        }}
      />
    </div>
  );
}
