"use client";

import { motion } from "framer-motion";
import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import HengeLogo from "@/components/ui/HengeLogo";
import FullscreenMenu from "./fullScreenMenu";

const navLinks = [
  { key: "nav.hengeWorld", href: "/about", hasDropdown: true },
  { key: "nav.products", href: "/products" },
  { key: "nav.collections", href: "/collections" },
  { key: "nav.projects", href: "/projects" },
  { key: "nav.designers", href: "/designers" },
  { key: "nav.hLife", href: "/hlife" },
  { key: "nav.contacts", href: "/contact" },
] as const;

export default function Header() {
  const [open, setOpen] = useState(false);
  const { t, lang, toggleLang } = useLanguage();

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="w-full h-full flex flex-col justify-between"
      >
        <div className="mx-auto w-full flex h-24 items-center justify-between px-8 md:px-14 lg:px-20 mt-1 z-50">
          {/* Logo */}
          <Link href="/" className="cursor-pointer">
            <HengeLogo className="w-24 h-auto fill-white transition-opacity hover:opacity-70" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="text-[13px] font-light uppercase tracking-[0.15em] text-white/80 transition-colors hover:text-white"
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-6 md:gap-8">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="text-[13px] font-light uppercase tracking-[0.15em] text-white/80 transition hover:text-white cursor-pointer"
            >
              {lang === "en" ? "فارسی" : "EN"}
            </button>

            <button className="text-white transition hover:opacity-70 cursor-pointer">
              <Search size={18} strokeWidth={2.2} />
            </button>

            <button
              onClick={() => setOpen(true)}
              className="text-white transition-opacity hover:opacity-70 cursor-pointer"
            >
              <Menu size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="text-start z-30 text-slate-100 hover:cursor-pointer px-8 md:px-14 lg:px-20 space-y-3 uppercase">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold">
            {t("hero.collection")}
          </h1>
          <h3 className="text-xl lg:text-3xl font-semibold">
            {t("hero.ritualGravity")}
          </h3>
          <button className="group flex items-center gap-2 uppercase">
            <span className="inline-block text-2xl transition-transform duration-300 ease-in-out group-hover:rotate-90">
              +
            </span>
            <span>{t("hero.readMore")}</span>
          </button>
        </div>
      </motion.header>
      <FullscreenMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}