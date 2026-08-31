"use client";

import AkoLightingLogo from "@/components/ui/Logo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "next/link";

const socialLinks = [
  {
    label: "Instagram",
    href: "#",
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-4 lg:w-4"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "#",
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-4 lg:w-4"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-4 lg:w-4"
      >
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "#",
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-4 lg:w-4"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "#",
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-4 lg:w-4"
      >
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "Telegram",
    href: "#",
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-4 lg:w-4"
      >
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#0e0e0e] text-white">
      <div className="mx-auto flex min-h-50 max-w-[1600px] flex-col px-5 py-8 sm:px-6 sm:py-10 md:flex-row md:items-center md:justify-between md:gap-12 md:px-12 md:py-12 lg:px-20 xl:px-[8.5vw]">
        {/* Top / Left */}
        <div className="flex w-full flex-col md:w-auto md:flex-row md:items-center md:gap-14 lg:gap-16">
          {/* Logo + Mobile Links */}
          <div className="flex w-full items-center justify-between md:w-auto md:justify-start">
            <Link href="/" className="cursor-pointer">
              <AkoLightingLogo className="h-auto w-20 fill-[#f4f4f4] transition-opacity hover:opacity-70 sm:w-24" />
            </Link>

            {/* Credits / Privacy - Mobile */}
            <div className="flex items-center gap-3 text-[10px] font-light tracking-[0.3px] text-[#646464] md:hidden">
              <Link
                href="/credits"
                className="underline underline-offset-2 transition-colors hover:text-white"
              >
                {t("footer.credits")}
              </Link>

              <Link
                href="/privacy"
                className="underline underline-offset-2 transition-colors hover:text-white"
              >
                {t("footer.privacy")}
              </Link>
            </div>
          </div>

          {/* Desktop Links */}
          <div className="hidden items-center gap-4 text-[16px] font-light tracking-[0.5px] text-[#646464] md:flex">
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

          {/* VAT */}
          <div className="mt-7 w-full text-center text-[10px] font-light tracking-[0.6px] text-[#646464] md:mt-0 md:w-auto md:text-left md:text-[16px] md:tracking-[1px]">
            {t("footer.vat")}
          </div>
        </div>

        {/* Social */}
        <div className="mt-7 flex flex-wrap w-full items-center justify-between md:mt-0 md:w-auto md:justify-end md:gap-3">
          {socialLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#292929] text-[#eeeeee] transition-all duration-300 hover:border-[#666] hover:bg-[#181818] sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-15 lg:w-15"
            >
              <Icon />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
