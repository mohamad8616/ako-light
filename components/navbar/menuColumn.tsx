"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import Link from "next/link";
import type { MenuLink } from "../header/data";

interface Props {
  titleKey: string;
  links: MenuLink[];
  delay: number;
  onLinkClick?: () => void;
}

export default function MenuColumn({
  titleKey,
  links,
  delay,
  onLinkClick,
}: Props) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay,
      }}
    >
      <h2 className="mb-5 text-[20px] font-light uppercase tracking-tight text-white/35 md:mb-6 md:text-[28px]">
        {t(titleKey)}
      </h2>

      <ul className="space-y-3 md:space-y-4">
        {links.map((item) => {
          const isExternal = item.href.startsWith("http");
          const linkKey = item.i18nKey;

          return (
            <li key={item.label}>
              {isExternal ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onLinkClick}
                  className="menu-link text-sm md:text-lg font-medium tracking-[0.12em] text-white transition-colors duration-300 hover:text-neutral-400"
                >
                  {t(linkKey)}
                </a>
              ) : (
                <Link
                  href={item.href}
                  onClick={onLinkClick}
                  className="menu-link text-sm md:text-lg font-medium tracking-[0.12em] text-white transition-colors duration-300 hover:text-neutral-400"
                >
                  {t(linkKey)}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
