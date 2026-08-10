"use client";

import Link from "next/link";
import {
  FaInstagram,
  FaFacebookF,
  FaYoutube,
  FaPinterestP,
  FaLinkedinIn,
  FaSpotify,
} from "react-icons/fa";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import HengeLogo from "@/components/ui/HengeLogo";

const socialLinks = [
  { label: "Instagram", href: "#", icon: FaInstagram },
  { label: "Facebook", href: "#", icon: FaFacebookF },
  { label: "YouTube", href: "#", icon: FaYoutube },
  { label: "Pinterest", href: "#", icon: FaPinterestP },
  { label: "LinkedIn", href: "#", icon: FaLinkedinIn },
  { label: "Spotify", href: "#", icon: FaSpotify },
];

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#0e0e0e] text-white">
      <div className="mx-auto flex min-h-50 max-w-[1600px] items-center justify-between gap-12 px-6 py-16 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Left */}
        <div className="flex items-center gap-14 lg:gap-16">
          {/* Logo */}
          <Link href="/" className="cursor-pointer">
            <HengeLogo className="w-24 h-auto fill-[#f4f4f4] transition-opacity hover:opacity-70" />
          </Link>

          {/* Links */}
          <div className="flex items-center gap-4 text-[16px] font-light tracking-[0.5px] text-[#646464]">
            <Link
              href="/credits"
              className="underline underline-offset-4 transition-colors hover:text-white"
            >
              {t("footer.credits")}
            </Link>
            <Link
              href="/privacy"
              className="underline underline-offset-4 transition-colors hover:text-white"
            >
              {t("footer.privacy")}
            </Link>
          </div>

          {/* Copyright */}
          <div className="hidden text-[16px] font-light tracking-[1px] text-[#646464] xl:block">
            {t("footer.vat")}
          </div>
        </div>

        {/* Social */}
        <div className="flex items-center gap-3">
          {socialLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className="group flex h-15 w-15 items-center justify-center rounded-full border border-[#292929] text-[#eeeeee] transition-all duration-300 hover:border-[#666] hover:bg-[#181818]"
            >
              <Icon
                size={17}
                className="transition-transform duration-300 group-hover:scale-110"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile VAT */}
      <div className="px-6 pb-10 text-[13px] font-light tracking-[0.7px] text-[#646464] xl:hidden">
        {t("footer.vat")}
      </div>
    </footer>
  );
}